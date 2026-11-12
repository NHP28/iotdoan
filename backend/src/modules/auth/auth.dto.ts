import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'ad', description: 'Tên đăng nhập hoặc email' })
  @IsString() @Length(2, 255) email: string;
  @ApiProperty({ example: 'ad' })
  @IsString() @Length(1, 128) password: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty({ example: 'taixe@example.com' }) @IsEmail() @MaxLength(255) email: string;
  @ApiProperty({ example: 'taixe123456', minLength: 6 }) @IsString() @Length(6, 128) password: string;
  @ApiProperty({ example: 'Nguyễn Văn An' }) @IsString() @Length(2, 100) full_name: string;
  @ApiPropertyOptional({ enum: ['user', 'driver'], default: 'user' }) @IsOptional() @IsIn(['user', 'driver']) role?: 'user' | 'driver';
  @ApiPropertyOptional({ example: '0912345678' }) @IsOptional() @IsString() @Matches(/^\+?[0-9]{9,15}$/) phone?: string;
  @ApiPropertyOptional({ example: 'B2-123456' }) @IsOptional() @IsString() @Length(5, 50) license_number?: string;
}
export class DriverProfileDto {
  @IsString() @Matches(/^\+?[0-9]{9,15}$/) phone: string;
  @IsString() @Length(5, 50) license_number: string;
}
export class RoleDto {
  @IsIn(['admin', 'user']) role: 'admin' | 'user';
}
export class FaceDto {
  @IsString() @MaxLength(4_200_000)
  @Matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
  image: string;
}
export class EnrollFaceDto {
  @IsOptional() @IsString() @MaxLength(4_200_000)
  @Matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
  image?: string;
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_-]{1,100}$/)
  device_id?: string;
}
export class RecognizeDto extends EnrollFaceDto {
  @IsIn(['CHECK_IN', 'CHECK_OUT']) check_type: 'CHECK_IN' | 'CHECK_OUT';
}
