import { NestFactory } from '@nestjs/core';
import { AppConfigService } from './app.config.service';
import { AppModule } from './app.module';
import { AppService } from './app.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(AppConfigService);
  console.log(config.GENERATE_MERKLE_ROOT_LOCAL)
  const startService = app.get(AppService);
  console.log(startService.start())

  await app.close();
}
bootstrap();
