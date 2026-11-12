process.env.TZ = 'Asia/Ho_Chi_Minh';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: '127.0.0.1',
      bodyLimit: 30 * 1024 * 1024, // 30 MB cho upload ảnh / telemetry snapshot
    }),
  );

  // Enable CORS cho Frontend Web / Mobile kết nối
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: false,
  });

  // Global Validation
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Driver Attendance & IoT Monitoring API')
    .setDescription('Hệ thống API NestJS + Fastify + Drizzle ORM (MySQL iotdb) quản lý tài xế, điểm danh khuôn mặt và nhận dữ liệu giám sát từ Raspberry Pi')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-device-key' }, 'deviceKey')
    .addTag('Drivers - Quản lý & Đăng ký tài xế')
    .addTag('Attendance - Điểm danh tài xế qua nhận diện')
    .addTag('Telemetry - Thu thập dữ liệu giám sát từ Raspberry Pi')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  document.security = [{ bearer: [] }, { deviceKey: [] }];
  SwaggerModule.setup('api/docs', app, document);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Server đang chạy tại: http://localhost:${port}`);
  logger.log(`📑 Swagger Docs sẵn sàng tại: http://localhost:${port}/api/docs`);
}

bootstrap();

