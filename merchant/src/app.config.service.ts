import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
    constructor(private readonly configService: ConfigService) { }

    get GENERATE_MERKLE_ROOT_LOCAL(): boolean {
        return this.configService.get<string>('GENERATE_MERKLE_ROOT_LOCAL') === '1';
    }

    get ACCEPT_UNCONFIRMED_INPUT_TRANSACTION(): boolean {
        return (
            this.configService.get<string>('ACCEPT_UNCONFIRMED_INPUT_TRANSACTION') ===
            '1'
        );
    }

    get WEB_SOCKET_ADDRESS(): string {
        return this.configService.get<string>('WEB_SOCKET_ADDRESS');
    }

    get APPLICATION_PORT(): number {
        return this.configService.get<number>('APPLICATION_PORT');
    }

    get APPLICATION_NAME(): string {
        return this.configService.get<string>('APPLICATION_NAME');
    }

    get APPLICATION_WEB_SOCKET_CALL_ID(): string {
        return this.configService.get<string>('APPLICATION_WEB_SOCKET_CALL_ID');
    }


}
