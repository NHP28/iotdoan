import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsInt, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTelemetryDto {
  @ApiProperty({ example: 'raspi-dms-01', description: 'ID phần cứng Raspberry Pi' })
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @ApiPropertyOptional({ example: 1, description: 'ID tài xế đang lái xe (nếu đã điểm danh)' })
  @IsInt()
  @IsOptional()
  driver_id?: number;

  @ApiPropertyOptional({ example: false, description: 'Phát hiện ngủ gật' })
  @IsBoolean()
  @IsOptional()
  drowsiness_detected?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Phát hiện mất tập trung' })
  @IsBoolean()
  @IsOptional()
  distraction_detected?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Phát hiện ngáp' })
  @IsBoolean()
  @IsOptional()
  yawn_detected?: boolean;

  @ApiPropertyOptional({ example: 0.28, description: 'Chỉ số Eye Aspect Ratio (EAR)' })
  @IsNumber()
  @IsOptional()
  eye_aspect_ratio?: number;

  @ApiPropertyOptional({ example: 'looking_straight', description: 'Tư thế đầu' })
  @IsString()
  @IsOptional()
  head_pose?: string;

  @ApiPropertyOptional({ example: 65.5, description: 'Tốc độ xe (km/h)' })
  @IsNumber()
  @IsOptional()
  speed?: number;

  @ApiPropertyOptional({ example: 10.762622, description: 'Tọa độ GPS Lat' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 106.660172, description: 'Tọa độ GPS Lng' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 'NORMAL', enum: ['NORMAL', 'WARNING', 'CRITICAL'] })
  @IsString()
  @IsOptional()
  alert_level?: string;

  @ApiPropertyOptional({ example: 'https://example.com/snapshot.jpg' })
  @IsString()
  @IsOptional()
  snapshot_url?: string;

  @ApiPropertyOptional({ description: 'Ảnh camera dạng data:image/jpeg;base64,... (tối đa 3 MB), lưu vào thư mục theo driver_id' })
  @IsOptional() @IsString() @MaxLength(4_000_100)
  @Matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
  snapshot_base64?: string;
}

