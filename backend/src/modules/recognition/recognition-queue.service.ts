import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { and, asc, eq, gt, inArray, lt } from 'drizzle-orm';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { recognitionDevices, recognitionJobs } from '../../drizzle/schemas/recognition-jobs.schema';
import { digest } from '../../common/token-digest';

@Injectable()
export class RecognitionQueueService {
  constructor(private db: DrizzleService) {}
  async devices() {
    const rows = await this.db.db.select().from(recognitionDevices);
    return rows.map(row => ({ ...row, online: Date.now() - row.last_seen.getTime() < 20000 }));
  }
  async request(deviceId: string, operation: 'ENCODE' | 'VERIFY', payload: object) {
    const devices = await this.devices();
    if (!devices.some(d => d.device_id === deviceId && d.online)) throw new ServiceUnavailableException(`Raspberry Pi ${deviceId} chưa kết nối. Vui lòng bật thiết bị và chương trình nhận diện.`);
    const id = randomUUID();
    await this.db.db.insert(recognitionJobs).values({ id, device_id: deviceId, operation, payload: JSON.stringify(payload), expires_at: new Date(Date.now() + 55000) });
    try {
      for (let i = 0; i < 104; i++) {
        await delay(500);
        const [job] = await this.db.db.select().from(recognitionJobs).where(eq(recognitionJobs.id, id));
        if (job?.status === 'SUCCEEDED') return JSON.parse(job.result || '{}');
        if (job?.status === 'FAILED') throw new BadRequestException(job.error || 'Pi chưa xác minh được khuôn mặt. Vui lòng thử lại.');
      }
      throw new ServiceUnavailableException('Raspberry Pi phản hồi quá thời gian. Vui lòng đứng trước camera và thử lại.');
    } finally {
      // Images and vectors are transient in the queue; only the driver profile keeps enrollment data.
      await this.db.db.update(recognitionJobs).set({ status: 'CONSUMED', payload: null, result: null, lease_hash: null }).where(eq(recognitionJobs.id, id));
    }
  }
  async poll(deviceId: string) {
    const now = new Date();
    await this.db.db.insert(recognitionDevices).values({ device_id: deviceId, last_seen: now }).onDuplicateKeyUpdate({ set: { last_seen: now } });
    await this.db.db.update(recognitionJobs).set({ status: 'FAILED', error: 'Yêu cầu đã hết hạn.', payload: null, result: null, lease_hash: null })
      .where(and(lt(recognitionJobs.expires_at, now), inArray(recognitionJobs.status, ['PENDING', 'PROCESSING'])));
    await this.db.db.delete(recognitionJobs).where(lt(recognitionJobs.created_at, new Date(Date.now() - 86400000)));
    return this.db.db.transaction(async tx => {
      const [job] = await tx.select().from(recognitionJobs).where(and(eq(recognitionJobs.device_id, deviceId), eq(recognitionJobs.status, 'PENDING'), gt(recognitionJobs.expires_at, now)))
        .orderBy(asc(recognitionJobs.created_at)).limit(1).for('update', { skipLocked: true });
      if (!job) return null;
      const lease = randomBytes(32).toString('hex');
      await tx.update(recognitionJobs).set({ status: 'PROCESSING', lease_hash: digest(lease) }).where(eq(recognitionJobs.id, job.id));
      return { id: job.id, operation: job.operation, payload: JSON.parse(job.payload || '{}'), lease, expires_at: job.expires_at };
    });
  }
  async complete(deviceId: string, id: string, body: { lease: string; error?: string; result?: object }) {
    await this.db.db.transaction(async tx => {
      const [job] = await tx.select().from(recognitionJobs).where(eq(recognitionJobs.id, id)).for('update');
      if (!job || job.device_id !== deviceId || job.status !== 'PROCESSING' || job.expires_at.getTime() <= Date.now() || !job.lease_hash || !timingSafeEqual(Buffer.from(digest(body.lease)), Buffer.from(job.lease_hash))) {
        throw new BadRequestException('Yêu cầu không hợp lệ hoặc đã hết hạn.');
      }
      await tx.update(recognitionJobs).set({ status: body.error ? 'FAILED' : 'SUCCEEDED', error: body.error || null, result: body.error ? null : JSON.stringify(body.result), payload: null, lease_hash: null }).where(eq(recognitionJobs.id, id));
    });
    return { success: true };
  }
}
