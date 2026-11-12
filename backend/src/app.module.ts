import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { DrizzleModule } from './drizzle/drizzle.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { AuthModule } from './modules/auth/auth.module';
import { RecognitionModule } from './modules/recognition/recognition.module';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DrizzleModule,
    AuthModule,
    RecognitionModule,
    DriversModule,
    AttendanceModule,
    TelemetryModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}

