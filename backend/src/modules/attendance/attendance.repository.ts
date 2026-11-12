import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { attendances } from '../../drizzle/schemas/attendances.schema';
import { drivers } from '../../drizzle/schemas/drivers.schema';
import { eq, desc } from 'drizzle-orm';
import { RecordAttendanceDto } from './dto/record-attendance.dto';

@Injectable()
export class AttendanceRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll() {
    return this.drizzle
      .select({
        id: attendances.id,
        driver_id: attendances.driver_id,
        driver_name: drivers.full_name,
        driver_code: drivers.driver_code,
        check_type: attendances.check_type,
        timestamp: attendances.timestamp,
        confidence_score: attendances.confidence_score,
        image_url: attendances.image_url,
        device_id: attendances.device_id,
        notes: attendances.notes,
        created_at: attendances.created_at,
      })
      .from(attendances)
      .leftJoin(drivers, eq(attendances.driver_id, drivers.id))
      .orderBy(desc(attendances.id));
  }

  async findByDriverId(driverId: number) {
    return this.drizzle
      .select()
      .from(attendances)
      .where(eq(attendances.driver_id, driverId))
      .orderBy(desc(attendances.id));
  }

  async create(data: RecordAttendanceDto) {
    const res = await this.drizzle.insert(attendances).values(data);
    const insertId = (res as any)[0]?.insertId;
    const rows = await this.drizzle.select().from(attendances).where(eq(attendances.id, insertId));
    return rows[0] || null;
  }
}

