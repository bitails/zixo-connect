import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app.config.service';
import { AppService } from './app.service';
import { EncryptionService } from './encryption/encryption.service';
import { WebSocketService } from './web_socket/web_socket.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [],
  providers: [WebSocketService, AppService, AppConfigService, EncryptionService],
  exports: [WebSocketService]
})
export class AppModule { }
