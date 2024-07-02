import { Module } from '@nestjs/common';
//import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from './api/api.module';
import { AppConfigService } from './app.config.service';
import { AppService } from './app.service';
import { EncryptionService } from './encryption/encryption.service';
import { JsonDbService } from './json-db/json-db.service';
import { TransactionService } from './transaction/transaction.service';
import { WebSocketService } from './web_socket/web_socket.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ApiModule,
  ],
  providers: [
    AppConfigService,
    AppService,
    WebSocketService,
    JsonDbService,
    EncryptionService,
    TransactionService,
  ],
  exports: [AppConfigService, EncryptionService],
})
export class AppModule {}
