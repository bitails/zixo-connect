import { Injectable, Logger } from '@nestjs/common';
import { Opcode, Script, Transaction } from 'bsv';
import {
    ScriptSig,
    TransactionModel,
    Vin,
    Vout
} from '../../types/transaction';

import { Interpreter } from 'bsv/lib/script';
import { createHash } from 'crypto';
import { AppConfigService } from 'src/app.config.service';
import { ReqUserDataModel } from 'src/public_model/user_req.model';


@Injectable()
export class TransactionService {
    constructor(private readonly appConfigService: AppConfigService) { }

    parseRawTransaction(rawTx: string): TransactionModel {
        const tx = new Transaction(rawTx);

        const vin: Vin[] = tx.inputs.map((input, index) => {
            const scriptSig: ScriptSig = {
                asm: input.script.toASM(),
                hex: input.script.toHex(),
                isTruncated: false,
            };

            return {
                n: index,
                txid: input.prevTxId.toString('hex'),
                vout: input.outputIndex,
                scriptSig,
                sequence: input.sequenceNumber,
            };
        });

        const vout: Vout[] = tx.outputs.map((output, index) => {
            const scriptPubKey = output.script;

            return {
                value: output.satoshis / 1e8,
                n: index,
                scriptPubKey: {
                    asm: scriptPubKey.toASM(),
                    hex: scriptPubKey.toHex(),
                    reqSigs: scriptPubKey.chunks.filter(
                        (chunk) => chunk.opcodenum === Opcode.OP_CHECKSIG,
                    ).length,
                    type: scriptPubKey.classify(),
                    isTruncated: false,
                },
                scripthash: scriptPubKey.toHex(),
                spent: {
                    txid: tx.id, // You'd need additional data to fill this
                    n: index,
                },
            };
        });

        const transactionModel: TransactionModel = {
            txid: tx.id,
            hash: tx.hash,
            size: tx.toBuffer().length,
            version: tx.version,
            locktime: tx.nLockTime,
            vin,
            vout,
            blockhash: '', // You'd need additional data to fill this
            confirmations: 0, // You'd need additional data to fill this
            time: 0, // You'd need additional data to fill this
            blocktime: 0, // You'd need additional data to fill this
            blockheight: 0, // You'd need additional data to fill this
            vincount: tx.inputs.length,
            voutcount: tx.outputs.length,
            //  vinvalue: vin.reduce((sum, input) => sum + input.voutDetails.value, 0),
            voutvalue: vout.reduce((sum, output) => sum + output.value, 0),
        };

        return transactionModel;
    }

    generateTxIdFromRawTransaction(rawTx: string): string {
        const txBuffer = Buffer.from(rawTx, 'hex');

        return createHash('sha256')
            .update(createHash('sha256').update(txBuffer).digest())
            .digest()
            .reverse()
            .toString('hex');
    }

    verifyInputsTransaction(
        reqUserDataModel: ReqUserDataModel
    ): boolean {
        try {
            const current: TransactionModel = this.parseRawTransaction(
                reqUserDataModel.currentTx,
            );

            const mergeOutputs: Vout[] = reqUserDataModel.inputs.flatMap(
                (input) => this.parseRawTransaction(input.rawTx).vout,
            );

            const isValid: boolean = current.vin.every((input: Vin) => {
                //const index = mergeOutputs.findIndex(output => output.spent?.txid === input.txid && output.n === input.vout);
                const index = mergeOutputs.findIndex((output) => {
                    if (this.appConfigService.ACCEPT_UNCONFIRMED_INPUT_TRANSACTION) {
                        // Treat unconfirmed transactions as valid
                        return output.spent?.txid === input.txid && output.n === input.vout;
                    } else {
                        return false;
                    }
                });
                return index !== -1;
            });

            return isValid;
        } catch (e) {
            Logger.error("error verifyInputsTransaction:", e);
            return false;
        }

    }

    verifyTxIds(reqUserDataModel: ReqUserDataModel): boolean {
        const allRawTransactions: string[] = reqUserDataModel.inputs.flatMap(input => input.rawTx);
        allRawTransactions.push(reqUserDataModel.currentTx);
        for (const rawTx of allRawTransactions) {
            const txid = this.generateTxIdFromRawTransaction(rawTx);
            const currentTx: TransactionModel = this.parseRawTransaction(rawTx);

            if (txid !== currentTx.txid) {
                Logger.debug(`Verification failed for transaction: ${rawTx}. Expected txid: ${currentTx.txid}, but got: ${txid}`);
                return false;
            }
        }

        Logger.debug('All transactions txids verified successfully.');
        return true;
    }


    private verifyScript(
        scriptSigHex: string,
        scriptPubKeyHex: string,
        tx: TransactionModel,
        inputIndex: number,
        reqUserDataModel: ReqUserDataModel,
    ): boolean {
        try {
            if (!scriptSigHex || !scriptPubKeyHex) {
                throw new Error('scriptSig or scriptPubKeyHex is undefined');
            }

            const scriptPubKey = Script.fromHex(scriptPubKeyHex);
            const scriptSig = Script.fromHex(scriptSigHex);
            const interpreter = new Interpreter();
            const flags =
                Script.Interpreter.SCRIPT_VERIFY_P2SH |
                Script.Interpreter.SCRIPT_VERIFY_STRICTENC |
                Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID;


            const prevTxRaw = reqUserDataModel.inputs.find(
                (txRaw) =>
                    this.generateTxIdFromRawTransaction(txRaw.rawTx) ===
                    tx.vin[inputIndex].txid,
            );

            if (!prevTxRaw) {
                throw new Error(`Input ${inputIndex} previous transaction not found.`);
            }


            const outputIndex = tx.vin[inputIndex].vout;
            const prevTx: Transaction = new Transaction(prevTxRaw.rawTx);
            const output = prevTx.outputs[outputIndex];
            const satoshisBN = output.satoshisBN;

            const result = interpreter.verify(
                scriptSig,
                scriptPubKey,
                new Transaction(reqUserDataModel.currentTx),
                inputIndex,
                flags,
                satoshisBN,
            );

            return result;
        } catch (error) {
            throw new Error(`Error verifying script: ${error.message}`);
        }
    }

    verifyInputScripts(reqUserDataModel: ReqUserDataModel): boolean {
        try {
            //Logger.debug("reqUserDataModel.currentTx", reqUserDataModel.currentTx)
            const currentTx: TransactionModel = this.parseRawTransaction(
                reqUserDataModel.currentTx,
            );

            //Logger.debug("currentTx", currentTx)
            let result = true;

            for (let index = 0; index < currentTx.vin.length; index++) {
                const input: Vin = currentTx.vin[index];

                const equalInputTxRaw = reqUserDataModel.inputs.find(
                    (tx) => this.generateTxIdFromRawTransaction(tx.rawTx) === input.txid,
                );
                if (!equalInputTxRaw) {
                    result = false;
                    break;
                }

                const equalInputTx = this.parseRawTransaction(equalInputTxRaw.rawTx);
                const scriptPubKey = equalInputTx.vout[input.vout]?.scriptPubKey?.hex;

                if (!scriptPubKey) {
                    result = false;
                    break;
                }

                const isValid = this.verifyScript(
                    input.scriptSig.hex,
                    scriptPubKey,
                    currentTx,
                    index,
                    reqUserDataModel,
                );

                if (!isValid) {
                    result = false;
                    break;
                }
            }

            return result;
        } catch (e) {
            Logger.error("error in verifyInputScripts", e);
            return false;
        }
    }

    verifyTransaction(reqUserDataModel: ReqUserDataModel): boolean {
        const verifyInputsTransaction: boolean = this.verifyInputsTransaction(reqUserDataModel);
        if (!verifyInputsTransaction) {
            return verifyInputsTransaction;
        }
        return true;
    }
}
