import { Controller, Get, Post, Body, Param, Query, Req, Res, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { DeviceOnly, Roles } from '../auth/auth.guard';
import { AlertHistoryQueryDto } from './dto/alert-history-query.dto';
import { SnapshotStorageService } from './snapshot-storage.service';

@ApiTags('Telemetry - Thu thập dữ liệu giám sát từ Raspberry Pi')
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService, private readonly snapshots: SnapshotStorageService) {}

  @Get('my-alerts')
  @Roles('driver')
  @ApiOperation({ summary: 'Lịch sử cảnh báo theo ngày của tài xế đang đăng nhập (UTC+7)' })
  async myAlerts(@Req() request, @Query() query: AlertHistoryQueryDto) {
    return this.telemetryService.getMyAlerts(request.user.driver_id, query);
  }

  @Get('drivers/:driverId/alerts')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin xem lịch sử vi phạm theo ngày của một tài xế (UTC+7)' })
  async driverAlerts(@Param('driverId', ParseIntPipe) driverId: number, @Query() query: AlertHistoryQueryDto) {
    return this.telemetryService.getDriverAlerts(driverId, query);
  }

  @Get('snapshots/:driverId/:filename')
  @Roles('admin', 'driver')
  @ApiOperation({ summary: 'Đọc ảnh cảnh báo; tài xế chỉ được xem ảnh của chính mình' })
  async snapshot(@Req() request, @Param('driverId', ParseIntPipe) driverId: number, @Param('filename') filename: string, @Res() reply: FastifyReply) {
    if (request.user.role !== 'admin' && request.user.driver_id !== driverId) throw new ForbiddenException('Bạn không có quyền xem ảnh này.');
    const photo = await this.snapshots.read(driverId, filename);
    return reply.header('Cache-Control', 'private, no-store').header('X-Content-Type-Options', 'nosniff').type(photo.type).send(photo.stream);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy dữ liệu telemetry mới nhất' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAll(@Query('limit') limit?: number) {
    return this.telemetryService.getAllTelemetry(limit ? Number(limit) : 50);
  }

  @Get('device/:deviceId')
  @ApiOperation({ summary: 'Lấy telemetry theo mã Raspberry Pi' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getByDevice(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: number,
  ) {
    return this.telemetryService.getTelemetryByDevice(deviceId, limit ? Number(limit) : 20);
  }

  @Post()
  @DeviceOnly()
  @ApiOperation({ summary: 'Raspberry Pi gửi log giám sát lái xe (ngủ gật, ngáp, mất tập trung, GPS,...)' })
  async pushTelemetry(@Body() dto: CreateTelemetryDto) {
    return this.telemetryService.recordTelemetry(dto);
  }
}

