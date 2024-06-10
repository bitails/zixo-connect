import { Module } from '@nestjs/common';
import { AppConfigService } from 'src/app.config.service';
import { EncryptionService } from 'src/encryption/encryption.service';
import { JsonDbService } from 'src/json-db/json-db.service';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';

@Module({
  controllers: [ApiController],
  providers: [ApiService, EncryptionService, JsonDbService, AppConfigService]
})
export class ApiModule { }
