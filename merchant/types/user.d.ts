import { BranchModel } from 'types/merkle';

export class UserModel {
  id: number;
  callId: string;
  socketAddress: string;
  name: string;
  encryptionKeyModel: EncryptionKeyModel;
  secondPartyPublicKeyHex: string;
  secondPartyivHex: string;
}

export class EncryptionKeyModel {
  privateKeyHex: string;
  publicKeyHex: string;
  ivHex: string;
}

export class ReqUserDataModel {
  currentTx: string;
  inputs: Input[];
}

class Input {
  rawTx: string;
  blockheight: number;
  branch: BranchModel[];
}
