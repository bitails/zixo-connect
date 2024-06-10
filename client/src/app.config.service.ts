import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
    constructor(private readonly configService: ConfigService) { }

    get APPLICATION_WEB_SOCKET_CALL_ID(): string {
        return this.configService.get<string>('APPLICATION_WEB_SOCKET_CALL_ID');
    }

}
