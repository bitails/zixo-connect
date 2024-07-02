import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AppConfigService } from 'src/app.config.service';
import { BlockService } from 'src/block/block.service';
import { EncryptionService } from 'src/encryption/encryption.service';
import { JsonDbService } from 'src/json-db/json-db.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { SocketEventEnum } from 'types/event';
import { SocketMessagemodel } from 'types/message';
import { SecondPartyPresentRequest } from 'types/secondPartyPresent';
import { ReqUserDataModel, UserModel } from 'types/user';
import { WebSocket } from 'ws';

@Injectable()
export class WebSocketService implements OnModuleInit, OnModuleDestroy {
  private webSocket: WebSocket;
  private reconnectInterval = 1000; // Initial reconnect interval in ms
  private readonly maxReconnectInterval = 30000; // Max reconnect interval in ms

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly jsonDbService: JsonDbService,
    private readonly encryptionService: EncryptionService,
    private readonly transactionService: TransactionService,
    private readonly blockService: BlockService,
  ) {}

  onModuleInit() {
    this.connectWebSocket();
  }

  private connectWebSocket() {
    const wsUrl = this.appConfigService.webSocketAddress; // Assuming you have the WebSocket URL in your config
    this.webSocket = new WebSocket(wsUrl, {
      perMessageDeflate: false, // Disable permessage-deflate if needed
    });

    this.webSocket.on('open', () => {
      Logger.debug('WebSocket connection established');
      this.reconnectInterval = 1000;
      const message = [this.appConfigService.applicationWebSocketCallId];
      const socketMessage: SocketMessagemodel = {
        id: -1,
        event: SocketEventEnum.PresentApplicationId,
        callId: '',
        message: message,
      };
      this.sendMessage(JSON.stringify(socketMessage));
    });

    this.webSocket.on('message', async (message: string) => {
      try {
        const parsedMessage = JSON.parse(message);

        if (this.isValidSocketMessage(parsedMessage)) {
          const socketMessage: SocketMessagemodel = {
            id: parsedMessage.id,
            event: parsedMessage.event as SocketEventEnum,
            callId: '',
            message: parsedMessage.message,
          };

          await this.handleMessage(socketMessage);
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

  private async handleMessage(socketMessage: SocketMessagemodel) {
    if (socketMessage.event === SocketEventEnum.PresentData) {
      await this.handlePresentData(socketMessage);
    } else if (socketMessage.event === SocketEventEnum.PresentSpvData) {
      await this.handlePresentSpvData(socketMessage);
    }
  }

  private async handlePresentData(socketMessage: SocketMessagemodel) {
    const user: UserModel = await this.jsonDbService.findOne(socketMessage.id);
    Logger.debug(`User is: ${JSON.stringify(user)}`);
    Logger.debug('Message is:', socketMessage.message);

    const decryptedMessage = this.encryptionService.decryptMyMessages(
      socketMessage.message,
      user,
    );
    Logger.debug('Decrypted Message:', decryptedMessage);

    const parsedDec = JSON.parse(decryptedMessage);
    if (parsedDec.callId && parsedDec.publicKeyHex) {
      const secondPartyPresentRequest: SecondPartyPresentRequest = {
        callId: parsedDec.callId,
        publicKeyHex: parsedDec.publicKeyHex,
        ivHex: parsedDec.ivHex,
      };

      if (
        secondPartyPresentRequest.callId ===
        this.appConfigService.applicationWebSocketCallId
      ) {
        Logger.debug('CallId is equal to Application callId');
        return;
      }

      user.callId = secondPartyPresentRequest.callId;
      user.secondPartyPublicKeyHex = secondPartyPresentRequest.publicKeyHex;
      user.secondPartyivHex = secondPartyPresentRequest.ivHex;
      await this.jsonDbService.update(user.id, user);
      Logger.debug('Updated user successfully', user);
    } else {
      Logger.debug('Invalid parsedDec:', socketMessage);
    }
  }

  private async handlePresentSpvData(socketMessage: SocketMessagemodel) {
    const user: UserModel = await this.jsonDbService.findOne(socketMessage.id);
    if (!user.callId) {
      Logger.debug('User did not provide callId');
      return;
    }

    if (!user.secondPartyPublicKeyHex) {
      Logger.debug('User did not provide publicKey');
      return;
    }

    const decryptedMessage = this.encryptionService.decryptMyMessages(
      socketMessage.message,
      user,
    );
    const parsedDec: ReqUserDataModel = JSON.parse(decryptedMessage);
    var reqUserDataModel: ReqUserDataModel = {
      currentTx: parsedDec.currentTx,
      inputs: parsedDec.inputs.map((input) => ({
        rawTx: input.rawTx,
        blockheight: input.blockheight || 0,
        branch: (input.branch || []).map((branch) => ({
          pos: branch.pos,
          hash: branch.hash,
        })),
      })),
    };

    const dataHasMerklePath =
      this.transactionService.checkDataHasBranchesAndBlockheight(
        reqUserDataModel,
      );
    if (!dataHasMerklePath) {
      if (this.appConfigService.requireClientMerklePath) {
        Logger.debug('Transaction is inValid');
        this.sendMessageToClient(user, 'transaction is invalid');
      } else {
        reqUserDataModel =
          await this.blockService.addMerklePathAndBlockHeightToData(
            reqUserDataModel,
          );
      }
    }

    const verifyTxIds = this.transactionService.verifyTxIds(reqUserDataModel);

    Logger.debug(`verifyTxIds: ${verifyTxIds}`);
    const verifyInputScripts =
      this.transactionService.verifyInputScripts(reqUserDataModel);
    Logger.debug(`verifyInputScripts: ${verifyInputScripts}`);
    const verifyInputsTransaction =
      this.transactionService.verifyInputsTransaction(reqUserDataModel);
    Logger.debug(`verifyInputsTransaction: ${verifyInputsTransaction}`);
    const verifyTransaction =
      this.transactionService.verifyTransaction(reqUserDataModel);
    Logger.debug(`verifyTransaction: ${verifyTransaction}`);

    if (
      verifyTxIds &&
      verifyInputScripts &&
      verifyInputsTransaction &&
      verifyTransaction
    ) {
      Logger.debug('Transaction is valid');
      this.sendMessageToClient(user, 'transaction is valid');
    }
  }

  sendMessageToClient(user: UserModel, message: string): void {
    const encryptedMessage = this.encryptionService.encryptMyMessages(
      message,
      user,
    );
    Logger.debug('Call ID:', user.callId);

    const responseMessage: SocketMessagemodel = {
      id: user.id,
      event: SocketEventEnum.PresentData,
      callId: user.callId,
      message: encryptedMessage,
    };

    this.sendMessage(JSON.stringify(responseMessage));
  }

  private isValidSocketMessage(message: any): message is SocketMessagemodel {
    return (
      message &&
      typeof message.id === 'number' &&
      typeof message.event === 'string' &&
      Array.isArray(message.message)
    );
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
      const message = [this.appConfigService.applicationWebSocketCallId];
      const socketMessage: SocketMessagemodel = {
        id: -1,
        event: SocketEventEnum.PresentRemoveApplicationId,
        callId: '',
        message: message,
      };

      this.sendMessage(JSON.stringify(socketMessage));
      this.webSocket.close();
    }
  }
}
