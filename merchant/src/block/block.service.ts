import * as bsv from 'bsv';
import { BlockHeaderModel, BranchModel, ProofModel } from '../../types/merkle';
import { Injectable, Logger } from '@nestjs/common';
import request from 'request';
import { AppConfigService } from 'src/app.config.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { TransactionModel } from 'types/transaction';
import { BlockModel } from '../../types/block';
import { ReqUserDataModel } from 'types/user';

@Injectable()
export class BlockService {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly transactionService: TransactionService,
  ) {}

  getBlockByHeight(blockHeight: number): Promise<BlockModel> {
    const url = `${this.appConfigService.ApiBaseAddress}block/height/${blockHeight}`;
    const options = {
      url: url,
      headers: {
        accept: '*/*',
      },
    };

    return new Promise((resolve, reject) => {
      request.get(options, (error, response, body) => {
        if (error) {
          Logger.error('Error fetching block by height:', error);
          reject(error);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  getBlockProofByTxId(txid: string): Promise<ProofModel> {
    const url = `${this.appConfigService.ApiBaseAddress}tx/${txid}/proof`;
    const options = {
      url: url,
      headers: {
        accept: '*/*',
      },
    };

    return new Promise((resolve, reject) => {
      request.get(options, (error, response, body) => {
        if (error) {
          Logger.error('Error fetching block proof by txid:', error);
          reject(error);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  getBlockByHeader(blockHeight: number): Promise<BlockHeaderModel> {
    const url = `${this.appConfigService.ApiBaseAddress}block/header/height/${blockHeight}/raw`;
    const options = {
      url: url,
      headers: {
        accept: '*/*',
      },
    };

    return new Promise((resolve, reject) => {
      request.get(options, (error, response, body) => {
        if (error) {
          Logger.error('Error fetching block header by height:', error);
          reject(error);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  async getMerkleRoot(blockHeight: number): Promise<string> {
    if (this.appConfigService.shouldGenerateMerkleRootLocally) {
      const block = await this.getBlockByHeight(blockHeight);
      return block.merkleroot;
    } else {
      const rawBlockHeader = await this.getBlockByHeader(blockHeight);
      const blockHeader = bsv.BlockHeader.fromBuffer(
        Buffer.from(rawBlockHeader.header, 'hex'),
      );
      return blockHeader.merkleRoot.toString('hex');
    }
  }

  computeMerkleRoot(txid: string, merklePath: BranchModel[]): string {
    let currentHash = Buffer.from(txid, 'hex').reverse(); // Reverse to little-endian

    merklePath.forEach((step) => {
      const siblingHash = Buffer.from(step.hash, 'hex').reverse(); // Reverse to little-endian

      if (step.pos === 'L') {
        currentHash = bsv.crypto.Hash.sha256sha256(
          Buffer.concat([siblingHash, currentHash]),
        );
      } else {
        currentHash = bsv.crypto.Hash.sha256sha256(
          Buffer.concat([currentHash, siblingHash]),
        );
      }
    });

    return currentHash.reverse().toString('hex'); // Reverse back to big-endian for final result
  }

  async getMerklePath(txId: string): Promise<BranchModel[]> {
    const url = `${this.appConfigService.ApiBaseAddress}tx/${txId}/proof`;
    const options = {
      uri: url,
      headers: {
        accept: 'application/json',
      },
      json: true,
    };

    try {
      const responseBody: any = await request.get(options);
      if (responseBody && responseBody.branches) {
        return responseBody.branches;
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      throw new Error(`Error fetching proof: ${error.message}`);
    }
  }

  async getBlockHeight(txId: string): Promise<number> {
    const url = `${this.appConfigService.ApiBaseAddress}tx/${txId}`;
    const options = {
      uri: url,
      headers: {
        accept: 'application/json',
      },
      json: true,
    };

    try {
      const responseBody: any = await request.get(options);
      if (responseBody && responseBody.blockheight) {
        return responseBody.blockheight;
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      throw new Error(`Error fetching proof: ${error.message}`);
    }
  }

  async addMerklePathAndBlockHeightToData(
    reqUserDataModel: ReqUserDataModel,
  ): Promise<ReqUserDataModel> {
    for (const input of reqUserDataModel.inputs) {
      const transactionModel: TransactionModel =
        this.transactionService.parseRawTransaction(input.rawTx);

      const updatedBranch: BranchModel[] = await this.getMerklePath(
        transactionModel.txid,
      );

      const blockHeight: number = await this.getBlockHeight(
        transactionModel.txid,
      );

      if (!input.branch) {
        input.branch = [];
      }
      input.blockheight = blockHeight;
      input.branch.push(...updatedBranch);
    }
    return reqUserDataModel;
  }

  async validateSourceOfTransaction(
    rawTx: string,
    merklePath: BranchModel[],
    blockheight: number,
  ): Promise<boolean> {
    if (this.appConfigService.acceptUnconfirmedUTXOs) {
      return true;
    }

    const transaction = this.transactionService.parseRawTransaction(rawTx);

    if (this.appConfigService.shouldGenerateMerkleRootLocally) {
      const computedMerkleRoot = this.computeMerkleRoot(
        transaction.txid,
        merklePath,
      );
      if (computedMerkleRoot) {
        return true;
      }
    }
    const validMerkleRoot = await this.getMerkleRoot(blockheight);
    const computedMerkleRoot = this.computeMerkleRoot(
      transaction.txid,
      merklePath,
    );

    return computedMerkleRoot === validMerkleRoot;
  }
}
