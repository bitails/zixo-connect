

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