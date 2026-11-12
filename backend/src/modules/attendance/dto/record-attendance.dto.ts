import { IsInt, IsNotEmpty, IsOptional, IsString, IsNumber, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordAttendanceDto {
  @ApiProperty({ example: 1, description: 'ID tài xế nhận diện được' })
  @IsInt()
  @IsNotEmpty()
  driver_id: number;

  @ApiPropertyOptional({ example: 'CHECK_IN', enum: ['CHECK_IN', 'CHECK_OUT'] })
  @IsIn(['CHECK_IN', 'CHECK_OUT'])
  @IsOptional()
  check_type?: string;

  @ApiPropertyOptional({ example: 98.5, description: 'Độ tin cậy của AI Face Recognition (%)' })
  @IsNumber()
  @IsOptional()
  confidence_score?: number;

  @ApiPropertyOptional({ example: 'https://example.com/checkin.jpg', description: 'Link hoặc snapshot checkin' })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiPropertyOptional({ example: 'raspi_camera_01', description: 'Mã Raspberry Pi' })
  @IsString()
  @IsOptional()
  device_id?: string;

  @ApiPropertyOptional({ example: 'Check-in thành công đầu ca' })
  @IsString()
  @IsOptional()
  notes?: string;
}

