import { Injectable } from '@nestjs/common';
import * as bsv from 'bsv';
import request from 'request';
import { AppConfigService } from 'src/app.config.service';
import { TransactionModel } from 'src/transaction/model/transaction.model';
import { TransactionService } from 'src/transaction/transaction.service';
import { BlockModel } from './model/block.model';
import { BlockHeader, Branch, Proof } from './model/proof.model';

@Injectable()
export class BlockService {
    constructor(private readonly appConfigService: AppConfigService, private readonly transactionService: TransactionService) { }

    getBlockByHeight(blockHeight: number): Promise<BlockModel> {
        const url = `https://api.bitails.io/block/height/${blockHeight}`;

        const options = {
            url: url,
            headers: {
                'accept': '*/*'
            }
        };
        return new Promise((resolve, reject) => {
            request.get(options, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    getBlockProofByTxid(txid: string): Promise<Proof> {
        const url = `https://api.bitails.io/tx/${txid}/proof`;

        const options = {
            url: url,
            headers: {
                'accept': '*/*'
            }
        };

        return new Promise((resolve, reject) => {
            request.get(options, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    getBlockByHeader(blockHeight: number): Promise<BlockHeader> {
        const url = `https://api.bitails.io/block/header/height/${blockHeight}/raw`;

        const options = {
            url: url,
            headers: {
                'accept': '*/*'
            }
        };

        return new Promise((resolve, reject) => {
            request.get(options, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    async getMerkleRoot(blockHeight: number): Promise<string> {
        if (this.appConfigService.GENERATE_MERKLE_ROOT_LOCAL) {
            const block: BlockModel = await this.getBlockByHeight(blockHeight);
            return block.merkleroot;
        } else {
            const rawBlockHeader: BlockHeader = await this.getBlockByHeader(blockHeight);

            const blockHeader = bsv.BlockHeader.fromBuffer(Buffer.from(rawBlockHeader.header, 'hex'));

            return blockHeader.merkleRoot.toString('Hex');
        }
    }

    computeMerkleRoot(txId: string, merklePath: Branch[]): string {
        let currentHash = Buffer.from(txId, 'hex').reverse(); // Reverse to little-endian

        merklePath.forEach(step => {
            const siblingHash = Buffer.from(step.hash, 'hex').reverse(); // Reverse to little-endian

            if (step.pos === 'L') {
                currentHash = bsv.crypto.Hash.sha256sha256(Buffer.concat([siblingHash, currentHash]));
            } else {
                currentHash = bsv.crypto.Hash.sha256sha256(Buffer.concat([currentHash, siblingHash]));
            }
        });

        return currentHash.reverse().toString('hex'); // Reverse back to big-endian for final result
    }

    async validateSourceOfTransaction(rawTx: string, merklePath: Branch[]): Promise<boolean> {
        const transaction: TransactionModel = this.transactionService.parseRawTransaction(rawTx);
        const validMrkleRoot = await this.getMerkleRoot(transaction.blockheight);
        const computeMrkleRoot = this.computeMerkleRoot(transaction.txid, merklePath);
        return computeMrkleRoot == validMrkleRoot;
    }
}