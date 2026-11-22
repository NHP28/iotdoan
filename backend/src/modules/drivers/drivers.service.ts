import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DriversRepository } from './drivers.repository';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { FaceDatasetService } from '../recognition/face-dataset.service';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { drivers } from '../../drizzle/schemas/drivers.schema';
import { accounts } from '../../drizzle/schemas/auth.schema';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { desc, eq, getTableColumns } from 'drizzle-orm';

@Injectable()
export class DriversService {
  constructor(private readonly driversRepo: DriversRepository, private readonly db: DrizzleService,
    private readonly faceDataset: FaceDatasetService) {}

  async getAllDrivers(includeEmbeddings = false) {
    if (includeEmbeddings) return this.driversRepo.findAll();
    const rows = await this.db.db.select({ ...getTableColumns(drivers), account_id: accounts.id, account_email: accounts.email })
      .from(drivers).leftJoin(accounts, eq(accounts.driver_id, drivers.id)).orderBy(desc(drivers.id));
    return rows.map(row => ({ ...row, face_registered: !!row.face_embedding, face_embedding: undefined }));
  }

  async getDriverById(id: number) {
    const driver = await this.driversRepo.findById(id);
    if (!driver) throw new NotFoundException(`Driver ID ${id} not found`);
    return driver;
  }

  async createDriver(dto: CreateDriverDto) {
    const existing = await this.driversRepo.findByCode(dto.driver_code);
    if (existing) {
      throw new BadRequestException(`Driver code '${dto.driver_code}' already exists`);
    }
    const { image, images, capture_source, enrollment_media, account_email, account_password, ...profile } = dto;
    if (!!account_email !== !!account_password) throw new BadRequestException('Vui lòng nhập cả email và mật khẩu để tạo tài khoản tài xế.');
    const enrollment = images?.length || image ? await this.faceDataset.prepare({ images: images || [image], capture_source, enrollment_media }) : null;
    const face = enrollment ? { face_embedding: enrollment.face_embedding, avatar_url: enrollment.avatar_url } : {};
    let passwordHash: string | undefined;
    if (account_password) {
      const salt = randomBytes(16).toString('hex');
      const hash = await promisify(scrypt)(account_password, salt, 64) as Buffer;
      passwordHash = `${salt}:${hash.toString('hex')}`;
    }
    try {
      return await this.db.db.transaction(async (tx) => {
        const [result] = await tx.insert(drivers).values({ ...profile, ...face });
        if (enrollment) await this.faceDataset.persist(tx, result.insertId, enrollment);
        if (account_email && passwordHash) await tx.insert(accounts).values({ email: account_email.trim().toLowerCase(), full_name: profile.full_name, password_hash: passwordHash, role: 'driver', driver_id: result.insertId });
        return { id: result.insertId, ...profile, avatar_url: face.avatar_url || profile.avatar_url, face_embedding: undefined,
          face_registered: !!enrollment || !!profile.face_embedding, sample_count: enrollment?.samples.length || 0, account_created: !!account_email };
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' || error.cause?.code === 'ER_DUP_ENTRY') throw new BadRequestException('Email hoặc mã tài xế đã được sử dụng.');
      throw error;
    }
  }

  async updateDriver(id: number, dto: UpdateDriverDto) {
    await this.getDriverById(id);
    const { image, images, capture_source, enrollment_media, account_email, account_password, ...profile } = dto;
    if (!!account_email !== !!account_password) throw new BadRequestException('Vui lòng nhập cả email và mật khẩu để tạo tài khoản tài xế.');
    const enrollment = images?.length || image ? await this.faceDataset.prepare({ images: images || [image], capture_source, enrollment_media }) : null;
    const face = enrollment ? { face_embedding: enrollment.face_embedding, avatar_url: enrollment.avatar_url } : {};
    let passwordHash: string | undefined;
    if (account_password) {
      const salt = randomBytes(16).toString('hex');
      const hash = await promisify(scrypt)(account_password, salt, 64) as Buffer;
      passwordHash = `${salt}:${hash.toString('hex')}`;
    }
    try {
      await this.db.db.transaction(async (tx) => {
        const [current] = await tx.select().from(drivers).where(eq(drivers.id, id)).for('update');
        if (!current) throw new NotFoundException('Không tìm thấy hồ sơ tài xế.');
        if (account_email && passwordHash) await tx.insert(accounts).values({ email: account_email.trim().toLowerCase(), full_name: profile.full_name || current.full_name, password_hash: passwordHash, role: 'driver', driver_id: id });
        await tx.update(drivers).set({ ...profile, ...face }).where(eq(drivers.id, id));
        if (enrollment) await this.faceDataset.persist(tx, id, enrollment);
        if (profile.full_name) await tx.update(accounts).set({ full_name: profile.full_name }).where(eq(accounts.driver_id, id));
      });
      return { success: true, account_created: !!account_email };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' || error.cause?.code === 'ER_DUP_ENTRY') throw new BadRequestException('Email, mã tài xế đã được sử dụng hoặc hồ sơ đã có tài khoản liên kết.');
      throw error;
    }
  }

  async deleteDriver(id: number) {
    await this.getDriverById(id);
    return this.driversRepo.delete(id);
  }
}

