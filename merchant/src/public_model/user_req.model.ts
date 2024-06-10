import { BranchModel } from "types/merkle";


export class ReqUserDataModel {
    currentTx: string;
    inputs: Input[];
}


class Input {
    rawTx: string;
    branch: BranchModel[]
}