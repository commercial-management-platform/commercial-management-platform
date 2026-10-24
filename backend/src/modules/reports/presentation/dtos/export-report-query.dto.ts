import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Matches, Min } from 'class-validator';

import { DATE_ONLY_PATTERN } from '../../../../shared/domain/time/business-time.js';
import {
  QUOTE_STATUSES,
  type QuoteStatus,
} from '../../../quotes/domain/entities/quote-status.js';
import {
  SALES_ORDER_STATUSES,
  type SalesOrderStatus,
} from '../../../sales-orders/domain/entities/sales-order-status.js';
import { VisitStatus } from '../../../visits/domain/visit-status.js';

/** Inclusive range of days shared by every report. No pagination: the CSV has every row. */
class DateRangeQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'First day included (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'fromDate must be YYYY-MM-DD' })
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'Last day included (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'toDate must be YYYY-MM-DD' })
  toDate?: string;

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

/** Filters of the dashboard tracking table (CA-02). */
export class ExportVisitTrackingQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-26',
    description:
      'Any day of the week to export (Monday to Sunday, business time America/Bogota). Cannot be combined with fromDate/toDate',
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

  @ApiPropertyOptional({ enum: VisitStatus })
  @IsOptional()
  @IsEnum(VisitStatus)
  status?: VisitStatus;
}

/** Filters of GET /quotes, without pagination. */
export class ExportQuotesQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ type: Number, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientId?: number;

  @ApiPropertyOptional({ enum: QUOTE_STATUSES, example: 'sent' })
  @IsOptional()
  @IsIn(QUOTE_STATUSES, {
    message: `status must be one of: ${QUOTE_STATUSES.join(', ')}`,
  })
  status?: QuoteStatus;
}

/** Filters of GET /sales-orders, without pagination. */
export class ExportSalesOrdersQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ type: Number, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientId?: number;

  @ApiPropertyOptional({ enum: SALES_ORDER_STATUSES, example: 'confirmed' })
  @IsOptional()
  @IsIn(SALES_ORDER_STATUSES, {
    message: `status must be one of: ${SALES_ORDER_STATUSES.join(', ')}`,
  })
  status?: SalesOrderStatus;
}
