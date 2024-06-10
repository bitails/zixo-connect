export class BlockModel {
  hash: string;
  size: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  transactionsCount: number;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  previousBlockHash: string;
  nextBlockHash: string;
  transactionsInputsCount: number;
  sumOfInputSatoshis: number;
  transactionsOutputsCount: number;
  sumOfOutputSatoshis: number;
  transactionsOpsCount: number;
  fees: number;
  averageFee: number;
  feeRate: number;
  blockSubsidy: number;
  minerId: string;
  orphan: boolean;
  tags: Tag[];
  partialTransactions: boolean;
  transactionsDetails: TransactionsDetail[];
}

export class Tag {
  tag: string;
  count: number;
}

export class TransactionsDetail {
  index: number;
  txid: string;
  inputsCount: number;
  outputsCount: number;
  size: number;
  ops?: number[];
  tags?: string[];
}
