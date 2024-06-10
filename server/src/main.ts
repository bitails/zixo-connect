import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from './app.config.service';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true
  }));
  const config = app.get(AppConfigService);
  const options = new DocumentBuilder()
    .setTitle('Server spv API')
    .setDescription('API of Server spv')
    .setVersion('1.0')
    .addTag('Server spv')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);
  await app.listen(config.APPLICATION_PORT);
}
bootstrap();
