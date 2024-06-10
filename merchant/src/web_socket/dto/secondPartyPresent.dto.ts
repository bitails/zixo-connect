
export class SecondPartyPresentRequest {
    callId: string;
    publicKeyHex: string;
    ivHex: string

    constructor(callId: string, publicKeyHex: string, ivHex: string) {
        this.callId = callId;
        this.publicKeyHex = publicKeyHex;
        this.ivHex = ivHex;
    }
}