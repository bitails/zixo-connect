import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
    constructor(private readonly configService: ConfigService) { }

    get APPLICATION_PORT(): number {
        return this.configService.get<number>('APPLICATION_PORT');
    }

    get NGROK_Token(): string {
        return this.configService.get<string>('NGROK_Token');
    }

    get APPLICATION_SOCKET_PORT(): number {
        return this.configService.get<number>('APPLICATION_SOCKET_PORT');
    }
}
