export class ScriptSig {
  asm: string;
  hex: string;
  isTruncated: boolean;
}

export class ScriptPubKey {
  asm: string;
  hex: string;
  reqSigs: number;
  type: string;
  addresses: string[];
  isTruncated: boolean;
}

export class VinDetails {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKey;
  scripthash: string;
}

export class Vin {
  n: number;
  txid: string;
  vout: number;
  scriptSig: ScriptSig;
  sequence: number;
  voutDetails?: VinDetails;
}

export class Vout {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKey;
  scripthash: string;
  spent?: {
    txid: string;
    n: number;
  };
}

export class TransactionModel {
  txid: string;
  hash: string;
  size: number;
  version: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
  blockheight: number;
  vincount: number;
  voutcount: number;
  // vinvalue: number;
  voutvalue: number;
}
