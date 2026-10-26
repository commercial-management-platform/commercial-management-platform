import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../../shared/presentation/dtos/pagination-query.dto.js';

export class ListFollowUpsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'overdue', 'completed'] })
  @IsOptional()
  @IsEnum(['pending', 'overdue', 'completed'])
  status?: 'pending' | 'overdue' | 'completed';

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  advisorId?: number;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
