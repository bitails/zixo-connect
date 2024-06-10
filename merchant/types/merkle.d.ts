export class ProofModel {
  blockhash: string;
  branches: BranchModel[];
  hash: string;
  merkleRoot: string;
}

export class BranchModel {
  pos: 'L' | 'R';
  hash: string;
}

export class BlockHeaderModel {
  header: string;
}
