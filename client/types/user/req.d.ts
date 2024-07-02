export class ReqUserDataModel {
  currentTx: string;
  inputs: Input[];
}

class Input {
  rawTx: string;
  blockheight: number;
  branch: BranchModel[];
}

export class BranchModel {
  pos: 'L' | 'R';
  hash: string;
}
