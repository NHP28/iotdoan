import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Injectable, Module, NotFoundException, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { FaceModelService } from './face-model.service';
import { desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../../drizzle/drizzle.service';
import { drivers } from '../../drizzle/schemas/drivers.schema';
import { attendances } from '../../drizzle/schemas/attendances.schema';
import { AuthUser } from '../auth/auth.service';
import { EnrollFaceDto, RecognizeDto } from '../auth/auth.dto';
import { Roles } from '../auth/auth.guard';
import { RecognitionQueueService } from './recognition-queue.service';
import { DeviceRecognitionController } from './device.controller';

@Injectable()
class RecognitionService {
  constructor(private db: DrizzleService, private faceModel: FaceModelService) {}
  async model(path: string, body?: object) {
    return this.faceModel.request(path, body);
  }
  async driver(user: AuthUser) {
    if (!user.driver_id) throw new BadRequestException('Vui lòng đăng ký hồ sơ tài xế trước.');
    const [driver] = await this.db.db.select().from(drivers).where(eq(drivers.id, user.driver_id));
    if (!driver) throw new NotFoundException('Không tìm thấy hồ sơ tài xế.');
    if (!driver.is_active) throw new ForbiddenException('Hồ sơ tài xế đang bị tạm ngưng.');
    return driver;
  }
  async enroll(user: AuthUser, dto: EnrollFaceDto) {
    const driver = await this.driver(user);
    const result = await this.faceModel.encode(dto.image, dto.device_id);
    await this.db.db.update(drivers).set(result).where(eq(drivers.id, driver.id));
    return { face_registered: true };
  }
  async recognize(user: AuthUser, dto: RecognizeDto) {
    const driver = await this.driver(user);
    if (!driver.face_embedding) throw new BadRequestException('Vui lòng đăng ký khuôn mặt trước khi điểm danh.');
    const result = await this.model('/verify', { image: dto.image, embedding: JSON.parse(driver.face_embedding), device_id: dto.device_id, driver_id: driver.id, driver_name: driver.full_name, check_type: dto.check_type });
    if (result.matched !== true) throw new ForbiddenException('Khuôn mặt không khớp hồ sơ đã đăng ký. Vui lòng thử lại.');
    if (typeof result.similarity !== 'number' || !Number.isFinite(result.similarity) || result.similarity < 0 || result.similarity > 100) throw new ServiceUnavailableException('Kết quả nhận diện không hợp lệ.');
    return this.db.db.transaction(async (tx) => {
      const [current] = await tx.select().from(drivers).where(eq(drivers.id, driver.id)).for('update');
      if (!current?.is_active) throw new ForbiddenException('Hồ sơ tài xế đang bị tạm ngưng.');
      if (current.face_embedding !== driver.face_embedding) throw new ConflictException('Hồ sơ khuôn mặt vừa thay đổi. Vui lòng nhận diện lại.');
      const [last] = await tx.select().from(attendances).where(eq(attendances.driver_id, driver.id)).orderBy(desc(attendances.id)).limit(1);
      if (dto.check_type === 'CHECK_OUT' && last?.check_type !== 'CHECK_IN') throw new ConflictException('Bạn cần check-in trước khi check-out.');
      if (dto.check_type === 'CHECK_IN' && last?.check_type === 'CHECK_IN') throw new ConflictException('Bạn đang trong ca. Hãy check-out trước.');
      const [insert] = await tx.insert(attendances).values({ driver_id: driver.id, check_type: dto.check_type, confidence_score: result.similarity, device_id: result.device_id || 'web-camera', notes: 'Xác minh khuôn mặt qua model AI' });
      const [record] = await tx.select().from(attendances).where(eq(attendances.id, insert.insertId));
      return record;
    });
  }
  async history(user: AuthUser) {
    if (!user.driver_id) return [];
    return this.db.db.select().from(attendances).where(eq(attendances.driver_id, user.driver_id)).orderBy(desc(attendances.id));
  }
  async status() {
    return this.faceModel.status();
  }
}

@Controller('recognition')
class RecognitionController {
  constructor(private recognition: RecognitionService) {}
  @Roles('driver') @Post('enroll') enroll(@Req() req, @Body() dto: EnrollFaceDto) { return this.recognition.enroll(req.user, dto); }
  @Roles('driver') @Post('attendance') attendance(@Req() req, @Body() dto: RecognizeDto) { return this.recognition.recognize(req.user, dto); }
  @Roles('driver') @Get('history') history(@Req() req) { return this.recognition.history(req.user); }
  @Roles('admin', 'driver', 'user') @Get('status') status() { return this.recognition.status(); }
}
@Module({ controllers: [RecognitionController, DeviceRecognitionController], providers: [RecognitionService, FaceModelService, RecognitionQueueService], exports: [FaceModelService] })
export class RecognitionModule {}
