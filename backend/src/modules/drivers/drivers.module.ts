import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriversRepository } from './drivers.repository';
import { RecognitionModule } from '../recognition/recognition.module';

@Module({
  imports: [RecognitionModule],
  controllers: [DriversController],
  providers: [DriversService, DriversRepository],
  exports: [DriversService, DriversRepository],
})
export class DriversModule {}

