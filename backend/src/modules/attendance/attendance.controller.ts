import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { DeviceOnly } from '../auth/auth.guard';

@ApiTags('Attendance - Điểm danh tài xế qua nhận diện')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: 'Lịch sử tất cả các lượt điểm danh' })
  async getAll() {
    return this.attendanceService.getAllAttendances();
  }

  @Get('driver/:driverId')
  @ApiOperation({ summary: 'Lịch sử điểm danh theo tài xế' })
  async getByDriver(@Param('driverId', ParseIntPipe) driverId: number) {
    return this.attendanceService.getByDriver(driverId);
  }

  @Post('check-in')
  @DeviceOnly()
  @ApiOperation({ summary: 'Raspberry Pi / Model AI gửi kết quả điểm danh nhận diện khuôn mặt' })
  async checkIn(@Body() dto: RecordAttendanceDto) {
    return this.attendanceService.recordAttendance(dto);
  }
}

