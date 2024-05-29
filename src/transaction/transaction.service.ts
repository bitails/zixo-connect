import { Injectable } from "@nestjs/common";
import { Opcode, Script, Transaction } from 'bsv';
import { Interpreter } from 'bsv/lib/script';
import { createHash } from "crypto";
import { AppConfigService } from "src/app.config.service";
import { ReqUserDataModel } from "src/public_model/user_req.model";
import { ScriptSig, TransactionModel, Vin, Vout } from "./model/transaction.model";
@Injectable()
export class TransactionService {
    constructor(private readonly appConfigService: AppConfigService) { }

    private extractAddresses(script: Script): string[] {
        const addresses: string[] = [];
        try {
            const address = script.toAddress();
            if (address) {
                addresses.push(address.toString());
            }
        } catch (e) {
            // Ignore errors and return empty addresses array if script can't be converted
        }
        return addresses;
    }

    parseRawTransaction(rawTx: string): TransactionModel {

        const tx = new Transaction(rawTx);

        const vin: Vin[] = tx.inputs.map((input, index) => {
            const scriptSig: ScriptSig = {
                asm: input.script.toASM(),
                hex: input.script.toHex(),
                isTruncated: false
            };

            return {
                n: index,
                txid: input.prevTxId.toString('hex'),
                vout: input.outputIndex,
                scriptSig,
                sequence: input.sequenceNumber,
                //   voutDetails
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
                    reqSigs: scriptPubKey.chunks.filter(chunk => chunk.opcodenum === Opcode.OP_CHECKSIG).length,
                    type: scriptPubKey.classify(),
                    addresses: this.extractAddresses(scriptPubKey),
                    isTruncated: false
                },
                scripthash: scriptPubKey.toHex(),
                spent: {
                    txid: tx.id, // You'd need additional data to fill this
                    n: index
                }
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
            blockhash: "", // You'd need additional data to fill this
            confirmations: 0, // You'd need additional data to fill this
            time: 0, // You'd need additional data to fill this
            blocktime: 0, // You'd need additional data to fill this
            blockheight: 0, // You'd need additional data to fill this
            vincount: tx.inputs.length,
            voutcount: tx.outputs.length,
            //  vinvalue: vin.reduce((sum, input) => sum + input.voutDetails.value, 0),
            voutvalue: vout.reduce((sum, output) => sum + output.value, 0)
        };

        return transactionModel;
    }

    generateTxidFromRawTransaction(rawTx: string): string {
        try {
            // Decode the raw transaction data to a Buffer
            const txBuffer = Buffer.from(rawTx, 'hex');

            // Hash the transaction data using SHA-256 twice
            const hash1 = createHash('sha256').update(txBuffer).digest();
            const hash2 = createHash('sha256').update(hash1).digest();

            // Reverse the double-hashed result to get the txid
            const txid = hash2.reverse().toString('hex');

            return txid;
        } catch (error) {
            console.error("Error calculating txid:", error);
            throw error; // Rethrow the error for handling at a higher level
        }
    }

    verifyInputsTransaction(currentTransactionRaw: string, inputsRaw: string[]): boolean {
        const current: TransactionModel = this.parseRawTransaction(currentTransactionRaw);
        console.log("Current Transaction:", JSON.stringify(current));

        const mergeOutputs: Vout[] = inputsRaw.flatMap(input => this.parseRawTransaction(input).vout);

        const isValid: boolean = current.vin.every((input: Vin) => {
            //const index = mergeOutputs.findIndex(output => output.spent?.txid === input.txid && output.n === input.vout);
            const index = mergeOutputs.findIndex(output => {
                if (this.appConfigService.ACCEPT_UNCONFIRMED_INPUT_TRANSACTION) {
                    // Treat unconfirmed transactions as valid
                    return (output.spent?.txid === input.txid && output.n === input.vout);
                } else {
                    return false;
                }
            });
            return index !== -1;
        });



        return isValid;
    }

    verifyTxid(rawTx: string): boolean {
        try {
            // Calculate the transaction ID from the raw transaction data
            const txId = this.generateTxidFromRawTransaction(rawTx);

            // Parse the transaction to get the current transaction object
            const currentTx: TransactionModel = this.parseRawTransaction(rawTx);

            // Compare the calculated txid with the parsed transaction's txid
            return txId === currentTx.txid;
        } catch (error) {
            console.error("Error validating txid:", error);
            return false; // Return false in case of an error
        }
    }

    private verifyScript(scriptSigHex: string, scriptPubKeyHex: string, tx: TransactionModel, inputIndex: number, reqUserDataModel: ReqUserDataModel): boolean {

        try {
            if (!scriptSigHex || !scriptPubKeyHex) {
                throw new Error("scriptSig or scriptPubKeyHex is undefined");
            }

            const scriptPubKey = Script.fromHex(scriptPubKeyHex);

            const scriptSig = Script.fromHex(scriptSigHex);

            const interpreter = new Interpreter();
            const flags = Script.Interpreter.SCRIPT_VERIFY_P2SH |
                Script.Interpreter.SCRIPT_VERIFY_STRICTENC |
                Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID;

            const prevTxRaw = reqUserDataModel.inputs.find(txRaw => this.generateTxidFromRawTransaction(txRaw.rawTx) === tx.vin[inputIndex].txid);

            if (!prevTxRaw) {
                throw new Error(`Input ${inputIndex} previous transaction not found.`);
            }

            const outputIndex = tx.vin[inputIndex].vout;
            const prevTx: Transaction = new Transaction(prevTxRaw);
            const output = prevTx.outputs[outputIndex];
            const satoshisBN = output.satoshisBN;
            //
            //

            const result = interpreter.verify(scriptSig, scriptPubKey, new Transaction(reqUserDataModel.currentTx), inputIndex, flags, satoshisBN);

            return result;
        } catch (error) {
            throw new Error(`Error verifying script: ${error.message}`);
        }
    }

    verifyInputScripts(reqUserDataModel: ReqUserDataModel): boolean {
        const currentTx: TransactionModel = this.parseRawTransaction(reqUserDataModel.currentTx);
        let result: boolean = true;

        for (let index = 0; index < currentTx.vin.length; index++) {
            const input: Vin = currentTx.vin[index];

            const equalInputTxRaw = reqUserDataModel.inputs.find(tx => this.generateTxidFromRawTransaction(tx.rawTx) === input.txid);
            if (!equalInputTxRaw) {
                // console.log(`Input ${index} not valid.`);
                result = false;
                break;
            }

            const equalInputTx = this.parseRawTransaction(equalInputTxRaw.rawTx);
            const scriptPubKey = equalInputTx.vout[input.vout]?.scriptPubKey?.hex;

            if (!scriptPubKey) {
                // console.log(`Input ${index} scriptPubKey not found.`);
                result = false;
                break;
            }

            const isValid = this.verifyScript(input.scriptSig.hex, scriptPubKey, currentTx, index, reqUserDataModel);
            //  console.log(`Input ${index} script evaluation is ${isValid ? 'TRUE' : 'FALSE'}`);

            if (!isValid) {
                result = false;
                break;
            }
        }

        return result;
    }
}