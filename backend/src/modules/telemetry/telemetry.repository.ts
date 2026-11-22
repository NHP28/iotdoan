import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { telemetry } from '../../drizzle/schemas/telemetry.schema';
import { drivers } from '../../drizzle/schemas/drivers.schema';
import { and, count, eq, desc, gte, lt, ne, or, sql } from 'drizzle-orm';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { AlertHistoryQueryDto } from './dto/alert-history-query.dto';

@Injectable()
export class TelemetryRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findDriver(id: number) {
    const [driver] = await this.drizzle.select({
      id: drivers.id, driver_code: drivers.driver_code, full_name: drivers.full_name,
    }).from(drivers).where(eq(drivers.id, id)).limit(1);
    return driver || null;
  }

  async findAll(limit: number = 50) {
    return this.drizzle
      .select({
        id: telemetry.id,
        device_id: telemetry.device_id,
        driver_id: telemetry.driver_id,
        driver_name: drivers.full_name,
        drowsiness_detected: telemetry.drowsiness_detected,
        distraction_detected: telemetry.distraction_detected,
        yawn_detected: telemetry.yawn_detected,
        eye_aspect_ratio: telemetry.eye_aspect_ratio,
        head_pose: telemetry.head_pose,
        speed: telemetry.speed,
        latitude: telemetry.latitude,
        longitude: telemetry.longitude,
        alert_level: telemetry.alert_level,
        snapshot_url: telemetry.snapshot_url,
        created_at: telemetry.created_at,
      })
      .from(telemetry)
      .leftJoin(drivers, eq(telemetry.driver_id, drivers.id))
      .orderBy(desc(telemetry.id))
      .limit(limit);
  }

  async findByDeviceId(deviceId: string, limit: number = 20) {
    return this.drizzle
      .select()
      .from(telemetry)
      .where(eq(telemetry.device_id, deviceId))
      .orderBy(desc(telemetry.id))
      .limit(limit);
  }

  async create(data: CreateTelemetryDto) {
    const res = await this.drizzle.insert(telemetry).values(data);
    const insertId = (res as any)[0]?.insertId;
    const rows = await this.drizzle.select().from(telemetry).where(eq(telemetry.id, insertId));
    return rows[0] || null;
  }

  async findDriverAlerts(driverId: number | null, from: Date, until: Date, query: AlertHistoryQueryDto) {
    const day = and(
      eq(telemetry.driver_id, driverId || -1),
      gte(telemetry.created_at, from), lt(telemetry.created_at, until),
      or(eq(telemetry.drowsiness_detected, true), eq(telemetry.distraction_detected, true), eq(telemetry.yawn_detected, true), ne(telemetry.alert_level, 'NORMAL')),
    );
    const flag = query.type === 'drowsiness' ? telemetry.drowsiness_detected : query.type === 'distraction' ? telemetry.distraction_detected : query.type === 'yawn' ? telemetry.yawn_detected : null;
    const filtered = and(day, flag ? eq(flag, true) : undefined,
      query.level === 'CRITICAL' ? eq(telemetry.alert_level, 'CRITICAL') : query.level === 'WARNING' ? ne(telemetry.alert_level, 'CRITICAL') : undefined);

    // Keep counts and pagination consistent while new Pi messages arrive.
    return this.drizzle.db.transaction(async tx => {
      const [summary] = await tx.select({ total: count(),
        critical: sql<number>`coalesce(sum(case when ${telemetry.alert_level} = 'CRITICAL' then 1 else 0 end), 0)`,
        drowsiness: sql<number>`coalesce(sum(${telemetry.drowsiness_detected}), 0)`,
        distraction: sql<number>`coalesce(sum(${telemetry.distraction_detected}), 0)`,
        yawn: sql<number>`coalesce(sum(${telemetry.yawn_detected}), 0)`,
      }).from(telemetry).where(day);
      const [matching] = await tx.select({ total: count() }).from(telemetry).where(filtered);
      const total = Number(matching.total);
      const totalPages = Math.max(1, Math.ceil(total / query.page_size));
      const page = Math.min(query.page, totalPages);
      const records = await tx.select({
        id: telemetry.id, device_id: telemetry.device_id, driver_id: telemetry.driver_id,
        drowsiness_detected: telemetry.drowsiness_detected, distraction_detected: telemetry.distraction_detected,
        yawn_detected: telemetry.yawn_detected, alert_level: telemetry.alert_level,
        speed: telemetry.speed, eye_aspect_ratio: telemetry.eye_aspect_ratio, head_pose: telemetry.head_pose,
        snapshot_url: telemetry.snapshot_url, created_at: telemetry.created_at,
      }).from(telemetry).where(filtered).orderBy(desc(telemetry.created_at), desc(telemetry.id))
        .limit(query.page_size).offset((page - 1) * query.page_size);
      return {
        summary: { total: Number(summary.total), critical: Number(summary.critical),
          warning: Number(summary.total) - Number(summary.critical), drowsiness: Number(summary.drowsiness),
          distraction: Number(summary.distraction), yawn: Number(summary.yawn) },
        records, pagination: { page, page_size: query.page_size, total, total_pages: totalPages },
      };
    });
  }
}

