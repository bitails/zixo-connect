import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { EncryptionKeyModel, MerchandModel } from 'src/web_socket/dto/merchand.dto';


@Injectable()
export class EncryptionService {

    generateEncryptionKey(): EncryptionKeyModel {

        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });

        const aliceKeyPrivateHex = privateKey.export({
            type: 'pkcs1',
            format: 'pem',
        }).toString('hex');

        const alicePublicPair = publicKey.export({
            type: 'spki',
            format: 'pem',
        }).toString('hex');

        const publicKeyHex = Buffer.from(alicePublicPair).toString('hex');
        const privateKeyHex = Buffer.from(aliceKeyPrivateHex).toString('hex');

        const iv = crypto.randomBytes(16);
        const ivHex = iv.toString('hex');

        return { privateKeyHex, publicKeyHex, ivHex }
    }

    private splitStringIntoChunks(input: string, maxChunkSize: number): string[] {
        const chunks: string[] = [];

        for (let i = 0; i < input.length; i += maxChunkSize) {
            const chunk = input.substring(i, i + maxChunkSize);
            chunks.push(chunk);
        }

        return chunks;
    }

    encryptMyMessages(message: string, merchand: MerchandModel): string[] {
        const messages: string[] = this.splitStringIntoChunks(message, 180);
        if (merchand.secondPartyivHex === '' || messages.length === 0 || merchand.secondPartyPublicKeyHex === '') {
            return [''];
        }

        const iv = Buffer.from(merchand.secondPartyivHex);

        const encryptedChunks = messages.map((message) => {
            const encryptedData = crypto.publicEncrypt(
                {
                    key: Buffer.from(merchand.secondPartyPublicKeyHex, 'hex'),
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256',
                    oaepLabel: iv,
                },
                Buffer.from(message)
            );
            return encryptedData.toString('base64');
        });

        //  const combinedString = encryptedChunks.join(',');

        return encryptedChunks;
    }

    decryptMyMessages(encryptedMessages: string[], user: MerchandModel): string {
        if (user.encryptionKeyModel.privateKeyHex === '' || user.encryptionKeyModel.ivHex === '') {
            Logger.debug('Data store is empty');
            return '';
        }

        const iv = Buffer.from(user.encryptionKeyModel.ivHex);

        const decryptedChunks = encryptedMessages.map((encryptedMessage) => {
            const decryptedData = crypto.privateDecrypt(
                {
                    key: Buffer.from(user.encryptionKeyModel.privateKeyHex, 'hex'),
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256',
                    oaepLabel: iv,
                },
                Buffer.from(encryptedMessage, 'base64')
            );

            return decryptedData.toString('utf-8');
        });

        return decryptedChunks.join('');
    }

}
