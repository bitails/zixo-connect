import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Opcode, Script, Transaction } from 'bsv';
import {
  ScriptSig,
  TransactionModel,
  Vin,
  Vout,
} from '../../types/transaction';
import { Interpreter } from 'bsv/lib/script';
import { createHash } from 'crypto';
import { AppConfigService } from 'src/app.config.service';
import { ReqUserDataModel } from 'types/user';
import { BlockService } from 'src/block/block.service';

@Injectable()
export class TransactionService {
  constructor(
    @Inject(forwardRef(() => BlockService))
    private readonly blockService: BlockService,
  ) {}

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
          txid: tx.id, // Additional data needed
          n: index,
        },
      };
    });

    return {
      txid: tx.id,
      hash: tx.hash,
      size: tx.toBuffer().length,
      version: tx.version,
      locktime: tx.nLockTime,
      vin,
      vout,
      blockhash: '', // Additional data needed
      confirmations: 0, // Additional data needed
      time: 0, // Additional data needed
      blocktime: 0, // Additional data needed
      blockheight: 0, // Additional data needed
      vincount: tx.inputs.length,
      voutcount: tx.outputs.length,
      voutvalue: vout.reduce((sum, output) => sum + output.value, 0),
    };
  }

  generateTxIdFromRawTransaction(rawTx: string): string {
    const txBuffer = Buffer.from(rawTx, 'hex');
    return createHash('sha256')
      .update(createHash('sha256').update(txBuffer).digest())
      .digest()
      .reverse()
      .toString('hex');
  }

  checkDataHasBranchesAndBlockheight(
    reqUserDataModel: ReqUserDataModel,
  ): boolean {
    for (const input of reqUserDataModel.inputs) {
      if (!input.branch || input.branch.length === 0) {
        return false;
      }
      if (!input.blockheight) {
        return false;
      }
    }
    return true;
  }

  async verifyInputsTransaction(
    reqUserDataModel: ReqUserDataModel,
  ): Promise<boolean> {
    try {
      const current: TransactionModel = this.parseRawTransaction(
        reqUserDataModel.currentTx,
      );

      for (var index in reqUserDataModel.inputs) {
        const input = reqUserDataModel.inputs[index];
        const status: boolean =
          await this.blockService.validateSourceOfTransaction(
            input.rawTx,
            input.branch,
            input.blockheight,
          );
        if (status == false) {
          return false;
        }
      }

      return true;

      // const mergeOutputs: Vout[] = reqUserDataModel.inputs.flatMap(
      //   (input) => this.parseRawTransaction(input.rawTx).vout,
      // );

      // return current.vin.every((input: Vin) => {
      //   const index = mergeOutputs.findIndex((output) => {
      //     if (this.appConfigService.acceptUnconfirmedUTXOs) {
      //       this.blockService.validateSourceOfTransaction(
      //         reqUserDataModel.currentTx,
      //         reqUserDataModel.
      //       );
      //       return output.spent?.txid === input.txid && output.n === input.vout;
      //     }
      //     return false;
      //   });
      //   return index !== -1;
      // });
    } catch (e) {
      Logger.error('Error in verifyInputsTransaction:', e);
      return false;
    }
  }

  verifyTxIds(reqUserDataModel: ReqUserDataModel): boolean {
    const allRawTransactions: string[] = reqUserDataModel.inputs.flatMap(
      (input) => input.rawTx,
    );
    allRawTransactions.push(reqUserDataModel.currentTx);

    for (const rawTx of allRawTransactions) {
      const txid = this.generateTxIdFromRawTransaction(rawTx);
      const currentTx: TransactionModel = this.parseRawTransaction(rawTx);

      if (txid !== currentTx.txid) {
        Logger.debug(
          `Verification failed for transaction: ${rawTx}. Expected txid: ${currentTx.txid}, but got: ${txid}`,
        );
        return false;
      }
    }

    Logger.debug('All transaction txids verified successfully.');
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

      return interpreter.verify(
        scriptSig,
        scriptPubKey,
        new Transaction(reqUserDataModel.currentTx),
        inputIndex,
        flags,
        satoshisBN,
      );
    } catch (error) {
      throw new Error(`Error verifying script: ${error.message}`);
    }
  }

  verifyInputScripts(reqUserDataModel: ReqUserDataModel): boolean {
    try {
      const currentTx: TransactionModel = this.parseRawTransaction(
        reqUserDataModel.currentTx,
      );

      return currentTx.vin.every((input: Vin, index) => {
        const equalInputTxRaw = reqUserDataModel.inputs.find(
          (tx) => this.generateTxIdFromRawTransaction(tx.rawTx) === input.txid,
        );
        if (!equalInputTxRaw) return false;

        const equalInputTx = this.parseRawTransaction(equalInputTxRaw.rawTx);
        const scriptPubKey = equalInputTx.vout[input.vout]?.scriptPubKey?.hex;
        if (!scriptPubKey) return false;

        return this.verifyScript(
          input.scriptSig.hex,
          scriptPubKey,
          currentTx,
          index,
          reqUserDataModel,
        );
      });
    } catch (e) {
      Logger.error('Error in verifyInputScripts', e);
      return false;
    }
  }

  async verifyTransaction(
    reqUserDataModel: ReqUserDataModel,
  ): Promise<boolean> {
    return await this.verifyInputsTransaction(reqUserDataModel);
  }
}
