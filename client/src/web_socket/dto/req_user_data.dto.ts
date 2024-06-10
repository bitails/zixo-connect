

export class ReqUserDataModel {
    currentTx: string;
    inputs: Input[];
}

class Input {
    rawTx: string;
    branch: BranchModel[]
}

export class BranchModel {
    pos: 'L' | 'R';
    hash: string;
}

