import { BadRequestException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { faceDatasets } from '../../drizzle/schemas/face-datasets.schema';
import { drivers } from '../../drizzle/schemas/drivers.schema';
import { FaceModelService } from './face-model.service';
import { EnrollmentDto } from './enrollment.dto';

@Injectable()
export class FaceDatasetService {
  constructor(private model: FaceModelService, private db: DrizzleService) {}

  async prepare(dto: EnrollmentDto) {
    if (!dto.images?.length) throw new BadRequestException('Vui lòng thêm ảnh chân dung hoặc quay video khuôn mặt.');
    let media: Buffer | null = null;
    let mime: string | null = null;
    if (dto.capture_source === 'video' && !dto.enrollment_media) throw new BadRequestException('Chưa nhận được video đăng ký. Hãy quay hoặc tải video lại.');
    if (dto.enrollment_media) {
      const match = /^data:(video\/(?:webm|mp4));base64,([A-Za-z0-9+/=]+)$/.exec(dto.enrollment_media);
      if (!match || dto.capture_source !== 'video' || !dto.images?.length) throw new BadRequestException('Video đăng ký không hợp lệ.');
      mime = match[1]; media = Buffer.from(match[2], 'base64');
      if (media.length > 8_000_000 || media.length < 12) throw new BadRequestException('Video cần nhỏ hơn 8 MB.');
      if (mime === 'video/webm' ? media.subarray(0, 4).toString('hex') !== '1a45dfa3' : media.subarray(4, 8).toString() !== 'ftyp') {
        throw new BadRequestException('Định dạng video không hợp lệ. Chọn WebM hoặc MP4.');
      }
    }
    const result = await this.model.encodeSamples(dto.images);
    return { ...result, media, mime, source: dto.images?.length ? dto.capture_source || 'photos' : 'pi' };
  }

  async persist(tx: DrizzleService['db'], driverId: number, prepared: Awaited<ReturnType<FaceDatasetService['prepare']>>) {
    await tx.update(drivers).set({ face_embedding: prepared.face_embedding, avatar_url: prepared.avatar_url }).where(eq(drivers.id, driverId));
    const data = { samples: JSON.stringify(prepared.samples), sample_count: prepared.samples.length,
      source: prepared.source, media_data: prepared.media, media_mime: prepared.mime, enrolled_at: new Date() };
    await tx.insert(faceDatasets).values({ driver_id: driverId, ...data }).onDuplicateKeyUpdate({ set: data });
  }

  async summary(driverId: number) {
    const [data] = await this.db.db.select({ sample_count: faceDatasets.sample_count, source: faceDatasets.source,
      enrolled_at: faceDatasets.enrolled_at }).from(faceDatasets).where(eq(faceDatasets.driver_id, driverId));
    return data || { sample_count: 0, source: null, enrolled_at: null };
  }
}
