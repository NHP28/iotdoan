import { Body, Controller, Get, Headers, Param, Post, BadRequestException } from '@nestjs/common';
import { IsObject, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { DeviceOnly } from '../auth/auth.guard';
import { RecognitionQueueService } from './recognition-queue.service';

class CompleteJobDto {
  @IsString() @Length(64, 64) lease: string;
  @IsOptional() @IsString() @MaxLength(500) error?: string;
  @IsOptional() @IsObject() result?: object;
}
@Controller('device/recognition')
@DeviceOnly()
export class DeviceRecognitionController {
  constructor(private queue: RecognitionQueueService) {}
  private id(value: string) {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(value || '')) throw new BadRequestException('Cần x-device-id hợp lệ.');
    return value;
  }
  @Get('jobs') poll(@Headers('x-device-id') deviceId: string) { return this.queue.poll(this.id(deviceId)); }
  @Post('jobs/:id/result') complete(@Headers('x-device-id') deviceId: string, @Param('id') id: string, @Body() body: CompleteJobDto) {
    if (!body.error && !body.result) throw new BadRequestException('Cần kết quả xử lý hoặc thông báo lỗi.');
    return this.queue.complete(this.id(deviceId), id, body);
  }
}
