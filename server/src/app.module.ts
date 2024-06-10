import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app.config.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ConfigModule.forRoot()],
  exports: [AppConfigService],
  controllers: [AppController],
  providers: [AppService, AppConfigService],
})
export class AppModule { }
