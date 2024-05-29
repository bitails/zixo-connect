import { Branch } from "src/bloc/model/proof.model";

export class ReqUserDataModel {
    currentTx: string;
    inputs: Input[];
}


class Input {
    rawTx: string;
    branch: Branch[]
}