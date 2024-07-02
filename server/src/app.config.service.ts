import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get applicationPort(): number {
    return this.configService.get<number>('APPLICATION_PORT');
  }

  get ngrokToken(): string {
    return this.configService.get<string>('NGROK_Token');
  }

  get applicationSocketPort(): number {
    return this.configService.get<number>('APPLICATION_SOCKET_PORT');
  }
}
