import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Injectable, Module, NotFoundException, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { FaceModelService } from './face-model.service';
import { desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { drivers } from '../../drizzle/schemas/drivers.schema';
import { attendances } from '../../drizzle/schemas/attendances.schema';
import { AuthUser } from '../auth/auth.service';
import { EnrollFaceDto, PreviewFaceDto, RecognizeDto } from '../auth/auth.dto';
import { Roles } from '../auth/auth.guard';
import { RecognitionQueueService } from './recognition-queue.service';
import { DeviceRecognitionController } from './device.controller';
import { FaceDatasetService } from './face-dataset.service';

@Injectable()
class RecognitionService {
  constructor(private db: DrizzleService, private faceModel: FaceModelService, private dataset: FaceDatasetService) {}
  async driver(user: AuthUser) {
    if (!user.driver_id) throw new BadRequestException('Vui lòng đăng ký hồ sơ tài xế trước.');
    const [driver] = await this.db.db.select().from(drivers).where(eq(drivers.id, user.driver_id));
    if (!driver) throw new NotFoundException('Không tìm thấy hồ sơ tài xế.');
    if (!driver.is_active) throw new ForbiddenException('Hồ sơ tài xế đang bị tạm ngưng.');
    return driver;
  }
  async enroll(user: AuthUser, dto: EnrollFaceDto) {
    const driver = await this.driver(user);
    const result = await this.dataset.prepare({ ...dto, images: dto.images || (dto.image ? [dto.image] : undefined) });
    await this.db.db.transaction(async tx => {
      const [current] = await tx.select().from(drivers).where(eq(drivers.id, driver.id)).for('update');
      if (!current?.is_active) throw new ForbiddenException('Hồ sơ nhân viên đang bị tạm ngưng.');
      await this.dataset.persist(tx, driver.id, result);
    });
    return { face_registered: true, driver_name: driver.full_name, sample_count: result.samples.length,
      message: 'Đăng ký nhân viên thành công. Model đã nhận diện khuôn mặt và lưu bộ mẫu vào MySQL.' };
  }
  async preview(user: AuthUser, dto: PreviewFaceDto) {
    await this.driver(user);
    return this.faceModel.preview(dto.image, dto.pose);
  }
  async recognize(user: AuthUser, dto: RecognizeDto) {
    const driver = await this.driver(user);
    if (!driver.face_embedding) throw new BadRequestException('Vui lòng đăng ký khuôn mặt trước khi điểm danh.');
    const result = await this.faceModel.verifyOnPi({ embedding: JSON.parse(driver.face_embedding), device_id: dto.device_id,
      driver_id: driver.id, driver_name: driver.full_name, check_type: dto.check_type });
    if (result.matched !== true) throw new ForbiddenException('Khuôn mặt không khớp hồ sơ đã đăng ký. Vui lòng thử lại.');
    if (typeof result.similarity !== 'number' || !Number.isFinite(result.similarity) || result.similarity < 0 || result.similarity > 100) throw new ServiceUnavailableException('Kết quả nhận diện không hợp lệ.');
    return this.db.db.transaction(async (tx) => {
      const [current] = await tx.select().from(drivers).where(eq(drivers.id, driver.id)).for('update');
      if (!current?.is_active) throw new ForbiddenException('Hồ sơ tài xế đang bị tạm ngưng.');
      if (current.face_embedding !== driver.face_embedding) throw new ConflictException('Hồ sơ khuôn mặt vừa thay đổi. Vui lòng nhận diện lại.');
      const [last] = await tx.select().from(attendances).where(eq(attendances.driver_id, driver.id)).orderBy(desc(attendances.id)).limit(1);
      if (dto.check_type === 'CHECK_OUT' && last?.check_type !== 'CHECK_IN') throw new ConflictException('Bạn cần check-in trước khi check-out.');
      if (dto.check_type === 'CHECK_IN' && last?.check_type === 'CHECK_IN') throw new ConflictException('Bạn đang trong ca. Hãy check-out trước.');
      const [insert] = await tx.insert(attendances).values({ driver_id: driver.id, check_type: dto.check_type, confidence_score: result.similarity,
        device_id: result.device_id, notes: 'Xác minh khuôn mặt từ camera Raspberry Pi' });
      const [record] = await tx.select().from(attendances).where(eq(attendances.id, insert.insertId));
      return { ...record, driver_name: driver.full_name };
    });
  }
  async history(user: AuthUser) {
    if (!user.driver_id) return [];
    return this.db.db.select().from(attendances).where(eq(attendances.driver_id, user.driver_id)).orderBy(desc(attendances.id));
  }
  async status() {
    return this.faceModel.status();
  }
  async datasetSummary(user: AuthUser) {
    const driver = await this.driver(user);
    return { driver_name: driver.full_name, face_registered: !!driver.face_embedding, ...await this.dataset.summary(driver.id) };
  }
}

@Controller('recognition')
class RecognitionController {
  constructor(private recognition: RecognitionService) {}
  @Roles('driver') @Post('enroll') enroll(@Req() req, @Body() dto: EnrollFaceDto) { return this.recognition.enroll(req.user, dto); }
  @Roles('driver') @Post('preview') preview(@Req() req, @Body() dto: PreviewFaceDto) { return this.recognition.preview(req.user, dto); }
  @Roles('driver') @Post('attendance') attendance(@Req() req, @Body() dto: RecognizeDto) { return this.recognition.recognize(req.user, dto); }
  @Roles('driver') @Get('history') history(@Req() req) { return this.recognition.history(req.user); }
  @Roles('driver') @Get('dataset') dataset(@Req() req) { return this.recognition.datasetSummary(req.user); }
  @Roles('admin', 'driver', 'user') @Get('status') status() { return this.recognition.status(); }
}
@Module({ controllers: [RecognitionController, DeviceRecognitionController], providers: [RecognitionService, FaceModelService, FaceDatasetService, RecognitionQueueService], exports: [FaceModelService, FaceDatasetService] })
export class RecognitionModule {}
