import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

import { DATE_ONLY_PATTERN } from '../../../../shared/domain/time/business-time.js';
import { PaginationQueryDto } from '../../../../shared/presentation/dtos/pagination-query.dto.js';
import { VisitStatus } from '../../../visits/domain/visit-status.js';

/** Filters of the indicators (CA-03). */
export class DashboardKpisQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-22',
    description:
      'Any day of the week (Monday to Sunday, business time America/Bogota). Defaults to the current week',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'week must be YYYY-MM-DD' })
  week?: string;

  @ApiPropertyOptional({ type: Number, example: 1, description: 'Zone of the client' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  zoneId?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 2,
    description: 'Advisor id. Ignored for an advisor',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  advisorId?: number;
}

/** Filters of the tracking table, the same ones the CSV export accepts (HU-17). */
export class VisitTrackingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-22',
    description:
      'Any day of the week. Cannot be combined with fromDate/toDate. Without dates: the current week',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'week must be YYYY-MM-DD' })
  week?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'First day included (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'fromDate must be YYYY-MM-DD' })
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Last day included (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'toDate must be YYYY-MM-DD' })
  toDate?: string;

  @ApiPropertyOptional({ type: Number, example: 1, description: 'Zone of the client' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  zoneId?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 2,
    description: 'Advisor id. Ignored for an advisor',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  advisorId?: number;

  @ApiPropertyOptional({ enum: VisitStatus })
  @IsOptional()
  @IsEnum(VisitStatus)
  status?: VisitStatus;

  @ApiPropertyOptional({
    example: 'ferreteria',
    description: 'Text in the client, municipality, advisor or route',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
