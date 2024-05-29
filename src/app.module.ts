import { Module } from '@nestjs/common';
//import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app.config.service';
import { AppService } from './app.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [AppConfigService, AppService],
  exports: [AppConfigService],
})
export class AppModule {}
