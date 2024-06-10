import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from './app.config.service';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  const options = new DocumentBuilder()
    .setTitle('Merchant API')
    .setDescription('API of Merchant')
    .setVersion('1.0')
    .addTag('Merchant')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  // const startService = app.get(AppService);
  // console.log(startService.start());
  SwaggerModule.setup('api', app, document);

  await app.listen(config.APPLICATION_PORT);
}
bootstrap();
