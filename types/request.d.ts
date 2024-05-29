import { Branch } from 'types/proof.model';

export class ReqUserDataModel {
  currentTx: string;
  inputs: Input[];
}

class Input {
  rawTx: string;
  branch: Branch[];
}
