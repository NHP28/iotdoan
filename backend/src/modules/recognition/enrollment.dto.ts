import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class EnrollmentDto {
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(8)
  @IsString({ each: true }) @MaxLength(4_200_000, { each: true })
  @Matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, { each: true })
  images?: string[];

  @IsOptional() @IsIn(['photos', 'video']) capture_source?: 'photos' | 'video';

  @IsOptional() @IsString() @MaxLength(11_200_000)
  @Matches(/^data:video\/(webm|mp4);base64,[A-Za-z0-9+/=]+$/)
  enrollment_media?: string;
}
