import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get GENERATE_MERKLE_ROOT_LOCAL(): boolean {
    return this.configService.get<string>('GENERATE_MERKLE_ROOT_LOCAL') === '1';
  }

  get ACCEPT_UNCONFIRMED_INPUT_TRANSACTION(): boolean {
    return (
      this.configService.get<string>('ACCEPT_UNCONFIRMED_INPUT_TRANSACTION') ===
      '1'
    );
  }
}
