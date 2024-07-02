import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get generateMerkleRootLocal(): boolean {
    return this.configService.get<string>('GENERATE_MERKLE_ROOT_LOCAL') === '1';
  }

  get acceptUnconfirmedInputTransaction(): boolean {
    return (
      this.configService.get<string>('ACCEPT_UNCONFIRMED_INPUT_TRANSACTION') ===
      '1'
    );
  }

  get webSocketAddress(): string {
    return this.configService.get<string>('WEB_SOCKET_ADDRESS');
  }

  get applicationPort(): number {
    return this.configService.get<number>('APPLICATION_PORT');
  }

  get applicationName(): string {
    return this.configService.get<string>('APPLICATION_NAME');
  }

  get applicationWebSocketCallId(): string {
    return this.configService.get<string>('APPLICATION_WEB_SOCKET_CALL_ID');
  }

  get ApiBaseAddress(): string {
    return this.configService.get<string>('API_BASE_ADDRESS');
  }
}
