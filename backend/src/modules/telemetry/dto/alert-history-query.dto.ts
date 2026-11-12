import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AlertHistoryQueryDto {
  @ApiPropertyOptional({ example: '2026-11-05', description: 'Ngày theo múi giờ Việt Nam (UTC+7)' })
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @ApiPropertyOptional({ enum: ['all', 'drowsiness', 'distraction', 'yawn'], default: 'all' })
  @IsIn(['all', 'drowsiness', 'distraction', 'yawn'])
  type: 'all' | 'drowsiness' | 'distraction' | 'yawn' = 'all';

  @ApiPropertyOptional({ enum: ['all', 'WARNING', 'CRITICAL'], default: 'all' })
  @IsIn(['all', 'WARNING', 'CRITICAL'])
  level: 'all' | 'WARNING' | 'CRITICAL' = 'all';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page = 1;

  @ApiPropertyOptional({ default: 8, minimum: 1, maximum: 50 })
  @Type(() => Number) @IsInt() @Min(1) @Max(50)
  page_size = 8;
}
