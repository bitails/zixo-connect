import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get shouldGenerateMerkleRootLocally(): boolean {
    return (
      this.configService.get<string>('FETCH_MERKLE_ROOT_IF_NOT_EXISTS') === '1'
    );
  }

  get acceptUnconfirmedUTXOs(): boolean {
    return this.configService.get<string>('ACCEPT_UNCONFIRMED_UTXOS') === '1';
  }

  get requireClientMerklePath(): boolean {
    return (
      this.configService.get<string>('REQUIRE_MERKLE_PATH_FROM_CLIENT') === '1'
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
