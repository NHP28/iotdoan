import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { and, desc, eq, gt } from 'drizzle-orm';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { accounts, sessions } from '../../drizzle/schemas/auth.schema';
import { drivers } from '../../drizzle/schemas/drivers.schema';
import { DriverProfileDto, LoginDto, RegisterDto } from './auth.dto';
import { FaceDatasetService } from '../recognition/face-dataset.service';
import { digest } from '../../common/token-digest';

const scrypt = promisify(scryptCallback);
export { digest } from '../../common/token-digest';
export type AuthUser = { id: number; email: string; full_name: string; role: string; driver_id: number | null };
export const publicAccount = (a: typeof accounts.$inferSelect): AuthUser => ({ id: a.id, email: a.email, full_name: a.full_name, role: a.role, driver_id: a.driver_id });

@Injectable()
export class AuthService {
  constructor(private readonly drizzle: DrizzleService, private readonly faceDataset: FaceDatasetService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const salt = randomBytes(16).toString('hex');
    const hash = (await scrypt(dto.password, salt, 64)) as Buffer;
    if (dto.role === 'driver' && (!dto.phone || !dto.license_number)) {
      throw new BadRequestException('Vui lòng nhập số điện thoại và giấy phép lái xe.');
    }
    try {
      return await this.drizzle.db.transaction(async (tx) => {
        let driverId: number | null = null;
        if (dto.role === 'driver') {
          const [result] = await tx.insert(drivers).values({
            driver_code: `TX-${randomBytes(5).toString('hex').toUpperCase()}`,
            full_name: dto.full_name.trim(), phone: dto.phone, license_number: dto.license_number,
          });
          driverId = result.insertId;
        }
        const [result] = await tx.insert(accounts).values({
          email, full_name: dto.full_name.trim(), password_hash: `${salt}:${hash.toString('hex')}`,
          role: dto.role || 'user', driver_id: driverId,
        });
        return { id: result.insertId, email, full_name: dto.full_name.trim(), role: dto.role || 'user', driver_id: driverId,
          face_registered: false, sample_count: 0 };
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' || error.cause?.code === 'ER_DUP_ENTRY') throw new ConflictException('Email đã được sử dụng.');
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const [account] = await this.drizzle.db.select().from(accounts).where(eq(accounts.email, dto.email.trim().toLowerCase())).limit(1);
    // Always perform the password KDF, including unknown accounts.
    const [salt, expected] = account?.password_hash.split(':') || ['0'.repeat(32), '0'.repeat(128)];
    const actual = (await scrypt(dto.password, salt, 64)) as Buffer;
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (!account || expectedBuffer.length !== actual.length || !timingSafeEqual(expectedBuffer, actual)) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }
    const token = randomBytes(32).toString('hex');
    await this.drizzle.db.insert(sessions).values({ token_hash: digest(token), account_id: account.id, expires_at: new Date(Date.now() + 7 * 86400000) });
    return { token, user: publicAccount(account) };
  }

  async authenticate(token: string): Promise<AuthUser> {
    if (!/^[a-f0-9]{64}$/.test(token || '')) throw new UnauthorizedException('Vui lòng đăng nhập.');
    const [row] = await this.drizzle.db.select({ account: accounts }).from(sessions)
      .innerJoin(accounts, eq(sessions.account_id, accounts.id))
      .where(and(eq(sessions.token_hash, digest(token)), gt(sessions.expires_at, new Date()))).limit(1);
    if (!row) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    return publicAccount(row.account);
  }

  async logout(token: string) {
    await this.drizzle.db.delete(sessions).where(eq(sessions.token_hash, digest(token)));
    return { success: true };
  }

  async me(user: AuthUser) {
    const [driver] = user.driver_id ? await this.drizzle.db.select().from(drivers).where(eq(drivers.id, user.driver_id)).limit(1) : [];
    const dataset = driver ? await this.faceDataset.summary(driver.id) : null;
    return { ...user, driver: driver ? { ...driver, face_embedding: undefined, face_registered: !!driver.face_embedding,
      face_sample_count: dataset.sample_count, face_source: dataset.source, face_enrolled_at: dataset.enrolled_at } : null };
  }

  async registerDriver(user: AuthUser, dto: DriverProfileDto) {
    if (user.role !== 'user' || user.driver_id) throw new ConflictException('Tài khoản không thể đăng ký thêm hồ sơ tài xế.');
    const enrollment = await this.faceDataset.prepare(dto);
    await this.drizzle.db.transaction(async (tx) => {
      const [current] = await tx.select().from(accounts).where(eq(accounts.id, user.id)).for('update');
      if (current.role !== 'user' || current.driver_id) throw new ConflictException('Hồ sơ tài xế đã tồn tại.');
      const [result] = await tx.insert(drivers).values({ driver_code: `TX-${randomBytes(5).toString('hex').toUpperCase()}`, full_name: user.full_name,
        phone: dto.phone, license_number: dto.license_number });
      await this.faceDataset.persist(tx, result.insertId, enrollment);
      await tx.update(accounts).set({ driver_id: result.insertId, role: 'driver' }).where(eq(accounts.id, user.id));
    });
    return { success: true };
  }

  async listAccounts() {
    const rows = await this.drizzle.db.select().from(accounts).orderBy(desc(accounts.id));
    return rows.map(publicAccount);
  }

  async setRole(actor: AuthUser, id: number, role: 'user' | 'admin') {
    if (actor.id === id) throw new ForbiddenException('Không thể tự thay đổi quyền của mình.');
    const [account] = await this.drizzle.db.select().from(accounts).where(eq(accounts.id, id));
    if (!account) throw new BadRequestException('Không tìm thấy tài khoản.');
    if (account.driver_id) throw new BadRequestException('Tài khoản tài xế phải giữ liên kết với hồ sơ tài xế.');
    await this.drizzle.db.transaction(async (tx) => {
      await tx.update(accounts).set({ role }).where(eq(accounts.id, id));
      await tx.delete(sessions).where(eq(sessions.account_id, id));
    });
    return { success: true };
  }
}
