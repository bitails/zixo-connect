import { Injectable, Logger } from '@nestjs/common';
import * as pako from 'pako';
import * as QRCode from 'qrcode';
import { AppConfigService } from 'src/app.config.service';
import { EncryptionService } from 'src/encryption/encryption.service';
import { JsonDbService } from 'src/json-db/json-db.service';
import { EncryptionKeyModel, UserModel } from 'types/user';

@Injectable()
export class ApiService {
    constructor(private readonly encryptionService: EncryptionService, private readonly jsonDbService: JsonDbService, private readonly appConfigService: AppConfigService) { }
    async generateQRCode(): Promise<Buffer> {
        try {

            const key: EncryptionKeyModel = this.encryptionService.generateEncryptionKey();
            const serverAddress: string = this.appConfigService.WEB_SOCKET_ADDRESS;
            const user: UserModel = await this.jsonDbService.create({ id: -1, callId: "", name: this.appConfigService.APPLICATION_NAME, secondPartyPublicKeyHex: '', encryptionKeyModel: { ivHex: key.ivHex, privateKeyHex: key.privateKeyHex, publicKeyHex: key.publicKeyHex }, socketAddress: serverAddress, secondPartyivHex: "" });
            // const userString = JSON.stringify(user);

            Logger.debug(user.id)

            const url = `${user.socketAddress}/?socketAddress=${user.socketAddress}&id=${user.id}&name=${user.name}&callId=${this.appConfigService.APPLICATION_WEB_SOCKET_CALL_ID}&ivHex=${user.encryptionKeyModel.ivHex}&publicKeyHex=${user.encryptionKeyModel.publicKeyHex}`

            const compressedData = pako.deflate(url, { to: 'string' });

            // Logger.debug(`url for QR code: ${url}`);

            const compressedBase64 = Buffer.from(compressedData).toString('base64');

            Logger.debug(`compressedData for QR code: ${compressedBase64}`);

            // Logger.debug(`User string for QR code: ${userString}`);
            const qrCodeBuffer = await QRCode.toBuffer(compressedBase64, {
                errorCorrectionLevel: 'L', // High error correction level
                version: 40 // Example specific version, you can adjust based on needs
            });

            return qrCodeBuffer;
        } catch (error) {
            Logger.debug(`Could not generate QR code: ${error}`)
            throw new Error('Could not generate QR code');
        }
    }
}
