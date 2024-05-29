import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
    constructor(private readonly configService: ConfigService) { }

    get GENERATE_MERKLE_ROOT_LOCAL(): boolean {
        return this.configService.get<boolean>('GENERATE_MERKLE_ROOT_LOCAL');
    }

    get ACCEPT_UNCONFIRMED_INPUT_TRANSACTION(): boolean {
        return this.configService.get<boolean>('ACCEPT_UNCONFIRMED_INPUT_TRANSACTION');
    }
}
