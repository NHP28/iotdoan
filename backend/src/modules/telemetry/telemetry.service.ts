import { BadRequestException, Injectable } from '@nestjs/common';
import { TelemetryRepository } from './telemetry.repository';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { AlertHistoryQueryDto } from './dto/alert-history-query.dto';
import { SnapshotStorageService } from './snapshot-storage.service';

@Injectable()
export class TelemetryService {
  constructor(private readonly telemetryRepo: TelemetryRepository, private readonly snapshots: SnapshotStorageService) {}

  async getAllTelemetry(limit?: number) {
    return this.telemetryRepo.findAll(limit || 50);
  }

  async getTelemetryByDevice(deviceId: string, limit?: number) {
    return this.telemetryRepo.findByDeviceId(deviceId, limit || 20);
  }

  async recordTelemetry(dto: CreateTelemetryDto) {
    const { snapshot_base64, ...record } = dto;
    const saved = snapshot_base64 ? await this.snapshots.save(dto.driver_id, snapshot_base64) : null;
    try { return await this.telemetryRepo.create({ ...record, ...(saved ? { snapshot_url: saved.url } : {}) }); }
    catch (error) { if (saved) await this.snapshots.remove(saved.path); throw error; }
  }

  async getMyAlerts(driverId: number | null, query: AlertHistoryQueryDto) {
    const date = query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const calendar = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== date || calendar.getUTCFullYear() < 2000 || calendar.getUTCFullYear() > 2100) {
      throw new BadRequestException('Ngày không hợp lệ. Sử dụng định dạng YYYY-MM-DD.');
    }
    const from = new Date(`${date}T00:00:00+07:00`);
    const until = new Date(from.getTime() + 86400000);
    const result = await this.telemetryRepo.findDriverAlerts(driverId, from, until, query);
    return { date, time_zone: 'Asia/Ho_Chi_Minh', filters: { type: query.type, level: query.level }, ...result, updated_at: new Date().toISOString() };
  }
}

