import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from 'src/app.config.service';
import { EncryptionService } from 'src/encryption/encryption.service';
import { JsonDbService } from 'src/json-db/json-db.service';
import { ReqUserDataModel } from 'src/public_model/user_req.model';
import { TransactionService } from 'src/transaction/transaction.service';
import { UserModel } from 'types/user';
import { WebSocket } from 'ws';
import { SecondPartyPresentRequest } from './dto/secondPartyPresent.dto';
import { SocketEventEnum } from './dto/socket_event.dto';
import { SocketMessagemodel } from './dto/socket_message.dto';

@Injectable()
export class WebSocketService implements OnModuleInit, OnModuleDestroy {
    private webSocket: WebSocket;
    private reconnectInterval: number = 1000; // Initial reconnect interval in ms
    private readonly maxReconnectInterval: number = 30000; // Max reconnect interval in ms

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly jsonDbService: JsonDbService,
        private readonly encryptionService: EncryptionService,
        private readonly transactionService: TransactionService
    ) { }

    onModuleInit() {
        this.connectWebSocket();
    }

    private connectWebSocket() {
        const wsUrl = this.appConfigService.WEB_SOCKET_ADDRESS; // Assuming you have the WebSocket URL in your config
        this.webSocket = new WebSocket(wsUrl, {
            perMessageDeflate: false, // Disable permessage-deflate if needed
        });

        this.webSocket.on('open', () => {
            Logger.debug('WebSocket connection established');
            this.reconnectInterval = 1000; // Reset the reconnect interval on successful connection
            const socketMessage = new SocketMessagemodel(
                -1,
                SocketEventEnum.PresentApplicationId,
                "",
                [this.appConfigService.APPLICATION_WEB_SOCKET_CALL_ID]
            );
            this.sendMessage(JSON.stringify(socketMessage));
        });

        this.webSocket.on('message', async (message) => {
            // Logger.debug(`Received message: ${message}`);
            try {
                const parsedMessage = JSON.parse(message);

                if (parsedMessage.event && Array.isArray(parsedMessage.message) && parsedMessage.id) {
                    const socketMessage = new SocketMessagemodel(
                        parsedMessage.id,
                        parsedMessage.event as SocketEventEnum,
                        "",
                        parsedMessage.message
                    );

                    //  Logger.debug('Socket Message Model:', socketMessage);

                    if (socketMessage.event === SocketEventEnum.PresentData) {
                        const user: UserModel = await this.jsonDbService.findOne(socketMessage.id);
                        Logger.debug(`user is : ${JSON.stringify(user)}`);
                        Logger.debug('Message is :', socketMessage.message);
                        const dec = this.encryptionService.decryptMyMessages(socketMessage.message, user);
                        Logger.debug('dycrypt Message :', dec);
                        const parsedDec = JSON.parse(dec);
                        if (parsedDec.callId && parsedDec.publicKeyHex) {
                            const secondPartyPresentRequest = new SecondPartyPresentRequest(
                                parsedDec.callId,
                                parsedDec.publicKeyHex,
                                parsedDec.ivHex
                            );

                            if (secondPartyPresentRequest.callId === this.appConfigService.APPLICATION_WEB_SOCKET_CALL_ID) {
                                Logger.debug("CallId is equal to Application callId");
                                return;
                            }

                            user.callId = secondPartyPresentRequest.callId;
                            user.secondPartyPublicKeyHex = secondPartyPresentRequest.publicKeyHex;
                            user.secondPartyivHex = secondPartyPresentRequest.ivHex
                            await this.jsonDbService.update(user.id, user);
                            Logger.debug('Updated user successfully', user);
                        } else {
                            Logger.debug('Invalid parsedDec:', socketMessage);
                        }
                    }

                    if (socketMessage.event === SocketEventEnum.PresentSpvData) {
                        const user: UserModel = await this.jsonDbService.findOne(socketMessage.id);
                        if (!user.callId) {
                            Logger.debug("User did not provide callId");
                            return;
                        }

                        if (!user.secondPartyPublicKeyHex) {
                            Logger.debug("User did not provide publicKey");
                            return;
                        }

                        const dec = this.encryptionService.decryptMyMessages(socketMessage.message, user);
                        const parsedDec: ReqUserDataModel = JSON.parse(dec);
                        const reqUserDataModel: ReqUserDataModel = {
                            currentTx: parsedDec.currentTx,
                            inputs: parsedDec.inputs.map(input => ({
                                rawTx: input.rawTx,
                                branch: input.branch.map(branch => ({
                                    pos: branch.pos,
                                    hash: branch.hash
                                }))
                            }))
                        };

                        //  Logger.debug(`User sent this transaction spv: ${JSON.stringify(reqUserDataModel)}`);

                        const verifyTxIds: boolean = this.transactionService.verifyTxIds(reqUserDataModel);
                        Logger.debug(`verifyTxIds: ${verifyTxIds}`);
                        const verifyInputScripts: boolean = this.transactionService.verifyInputScripts(reqUserDataModel);
                        Logger.debug(`verifyInputScripts: ${verifyInputScripts}`);
                        const verifyInputsTransaction: boolean = this.transactionService.verifyInputsTransaction(reqUserDataModel);
                        Logger.debug(`verifyInputsTransaction: ${verifyInputsTransaction}`);
                        const verifyTransaction: boolean = this.transactionService.verifyTransaction(reqUserDataModel);
                        Logger.debug(`verifyTransaction: ${verifyTransaction}`);

                        if (verifyTxIds && verifyInputScripts && verifyInputsTransaction && verifyTransaction) {
                            Logger.debug('Transaction is valid');

                            const message = this.encryptionService.encryptMyMessages("transaction is valid", user)
                            Logger.debug("call is", user.callId);
                            const socketMessagemodel: SocketMessagemodel = new SocketMessagemodel(user.id, SocketEventEnum.PresentData, user.callId, message);
                            this.sendMessage(JSON.stringify(socketMessagemodel));
                        }
                    }
                } else {
                    Logger.debug('Invalid message format');
                }
            } catch (error) {
                Logger.debug('Error parsing message:', error);
            }
        });

        this.webSocket.on('error', (error) => {
            Logger.error(`WebSocket error: ${error.message}`);
            this.handleReconnect();
        });

        this.webSocket.on('close', () => {
            Logger.debug('WebSocket connection closed');
            this.handleReconnect();
        });
    }

    private handleReconnect() {
        if (this.reconnectInterval <= this.maxReconnectInterval) {
            setTimeout(() => {
                Logger.debug(`Attempting to reconnect in ${this.reconnectInterval}ms`);
                this.connectWebSocket();
                this.reconnectInterval *= 2; // Exponential backoff
            }, this.reconnectInterval);
        } else {
            Logger.error('Max reconnect interval reached. Could not reconnect.');
        }
    }

    sendMessage(message: string) {
        if (this.webSocket.readyState === WebSocket.OPEN) {
            this.webSocket.send(message);
        } else {
            Logger.error('WebSocket is not open. Unable to send message.');
        }
    }

    onModuleDestroy() {
        if (this.webSocket) {
            const socketMessage = new SocketMessagemodel(
                -1,
                SocketEventEnum.PresentRemoveApplicationId,
                "",
                [this.appConfigService.APPLICATION_WEB_SOCKET_CALL_ID]
            );
            this.sendMessage(JSON.stringify(socketMessage));
            this.webSocket.close();
        }
    }
}
