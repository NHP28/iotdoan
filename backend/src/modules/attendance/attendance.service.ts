import { Injectable } from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository';
import { RecordAttendanceDto } from './dto/record-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly attendanceRepo: AttendanceRepository) {}

  async getAllAttendances() {
    return this.attendanceRepo.findAll();
  }

  async getByDriver(driverId: number) {
    return this.attendanceRepo.findByDriverId(driverId);
  }

  async recordAttendance(dto: RecordAttendanceDto) {
    return this.attendanceRepo.create(dto);
  }
}

