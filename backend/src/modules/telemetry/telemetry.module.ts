import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { TelemetryRepository } from './telemetry.repository';
import { SnapshotStorageService } from './snapshot-storage.service';

@Module({
  controllers: [TelemetryController],
  providers: [TelemetryService, TelemetryRepository, SnapshotStorageService],
  exports: [TelemetryService, TelemetryRepository],
})
export class TelemetryModule {}

