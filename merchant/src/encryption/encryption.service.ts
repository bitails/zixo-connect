import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { EncryptionKeyModel, UserModel } from 'types/user';

@Injectable()
export class EncryptionService {
  generateEncryptionKey(): EncryptionKeyModel {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });

    const privateKeyPem = privateKey
      .export({ type: 'pkcs1', format: 'pem' })
      .toString('hex');
    const publicKeyPem = publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString('hex');

    const privateKeyHex = Buffer.from(privateKeyPem).toString('hex');
    const publicKeyHex = Buffer.from(publicKeyPem).toString('hex');

    const iv = crypto.randomBytes(16).toString('hex');

    return { privateKeyHex, publicKeyHex, ivHex: iv };
  }

  private splitStringIntoChunks(input: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < input.length; i += maxChunkSize) {
      chunks.push(input.substring(i, i + maxChunkSize));
    }
    return chunks;
  }

  encryptMyMessages(message: string, user: UserModel): string[] {
    const messages = this.splitStringIntoChunks(message, 180);
    if (
      !user.secondPartyivHex ||
      messages.length === 0 ||
      !user.secondPartyPublicKeyHex
    ) {
      return [''];
    }

    const iv = Buffer.from(user.secondPartyivHex, 'hex');
    return messages.map((msg) => {
      const encryptedData = crypto.publicEncrypt(
        {
          key: Buffer.from(user.secondPartyPublicKeyHex, 'hex'),
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
          oaepLabel: iv,
        },
        Buffer.from(msg),
      );
      return encryptedData.toString('base64');
    });
  }

  decryptMyMessages(encryptedMessages: string[], user: UserModel): string {
    if (
      !user.encryptionKeyModel.privateKeyHex ||
      !user.encryptionKeyModel.ivHex
    ) {
      Logger.debug('Encryption key model or IV is empty');
      return '';
    }

    const iv = Buffer.from(user.encryptionKeyModel.ivHex);
    Logger.debug('IV is', iv);

    try {
      const decryptedChunks = encryptedMessages.map((encryptedMessage) => {
        const decryptedData = crypto.privateDecrypt(
          {
            key: Buffer.from(user.encryptionKeyModel.privateKeyHex, 'hex'),
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
            oaepLabel: iv,
          },
          Buffer.from(encryptedMessage, 'base64'),
        );
        return decryptedData.toString('utf-8');
      });
      return decryptedChunks.join('');
    } catch (error) {
      Logger.error('Error decrypting message:', error);
      return '';
    }
  }
}
