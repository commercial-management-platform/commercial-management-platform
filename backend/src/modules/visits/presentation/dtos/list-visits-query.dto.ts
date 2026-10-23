import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Min } from 'class-validator';

import { DATE_ONLY_PATTERN } from '../../../../shared/domain/time/business-time.js';
import { PaginationQueryDto } from '../../../../shared/presentation/dtos/pagination-query.dto.js';
import { VisitStatus } from '../../domain/visit-status.js';

export class ListVisitsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '2026-01-15',
    description: 'A single day (business time). Cannot be combined with week.',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({
    example: '2026-01-15',
    description:
      'Any date of the target week (Monday to Sunday, business time). Cannot be combined with date.',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'week must be YYYY-MM-DD' })
  week?: string;

  @ApiPropertyOptional({ type: Number, description: 'Ignored for an advisor' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  advisorId?: number;

  @ApiPropertyOptional({ type: Number, description: 'Zone of the client' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  zoneId?: number;

  @ApiPropertyOptional({ enum: VisitStatus })
  @IsOptional()
  @IsEnum(VisitStatus)
  status?: VisitStatus;
}
