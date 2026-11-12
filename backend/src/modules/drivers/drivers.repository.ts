import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { drivers } from '../../drizzle/schemas/drivers.schema';
import { eq, desc } from 'drizzle-orm';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll() {
    return this.drizzle.select().from(drivers).orderBy(desc(drivers.id));
  }

  async findById(id: number) {
    const rows = await this.drizzle.select().from(drivers).where(eq(drivers.id, id));
    return rows[0] || null;
  }

  async findByCode(driverCode: string) {
    const rows = await this.drizzle.select().from(drivers).where(eq(drivers.driver_code, driverCode));
    return rows[0] || null;
  }

  async create(data: CreateDriverDto) {
    const res = await this.drizzle.insert(drivers).values(data);
    const insertId = (res as any)[0]?.insertId;
    return this.findById(insertId);
  }

  async update(id: number, data: UpdateDriverDto) {
    await this.drizzle.update(drivers).set(data).where(eq(drivers.id, id));
    return this.findById(id);
  }

  async delete(id: number) {
    await this.drizzle.delete(drivers).where(eq(drivers.id, id));
    return { success: true, deletedId: id };
  }
}

