export class Proof {
  blockhash: string;
  branches: Branch[];
  hash: string;
  merkleRoot: string;
}

export class Branch {
  pos: 'L' | 'R';
  hash: string;
}

export class BlockHeader {
  header: string;
}
