import { IsString, IsNotEmpty, IsOptional, IsEmail, Length, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDriverDto {
  @ApiProperty({ example: 'TX001', description: 'Mã định danh tài xế' })
  @IsString()
  @IsNotEmpty()
  driver_code: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên tài xế' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'GPLX-B2-123456' })
  @IsString()
  @IsOptional()
  license_number?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar_url?: string;

  @ApiPropertyOptional({ description: 'Chuỗi JSON vector đặc trưng khuôn mặt (face embedding)' })
  @IsString()
  @IsOptional()
  face_embedding?: string;

  @IsOptional() @IsString() @MaxLength(4_200_000)
  @Matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
  image?: string;

  @IsOptional() @IsEmail() @MaxLength(255)
  account_email?: string;

  @IsOptional() @IsString() @Length(6, 128)
  account_password?: string;
}

