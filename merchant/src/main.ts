import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from './app.config.service';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(AppConfigService);

  setupSwagger(app);

  await app.listen(configService.applicationPort);
}

function setupSwagger(app: any) {
  const options = new DocumentBuilder()
    .setTitle('Merchant API')
    .setDescription('API of Merchant')
    .setVersion('1.0')
    .addTag('Merchant')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);
}

bootstrap();
