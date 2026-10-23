import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Min } from 'class-validator';

import { PaginationQueryDto } from '../../../../shared/presentation/dtos/pagination-query.dto.js';
import {
  QUOTE_STATUSES,
  type QuoteStatus,
} from '../../domain/entities/quote-status.js';

export class ListQuotesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientId?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 2,
    description: 'Ignored for no role; applies to all visible quotes',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  advisorId?: number;

  @ApiPropertyOptional({ enum: QUOTE_STATUSES, example: 'sent' })
  @IsOptional()
  @IsIn(QUOTE_STATUSES, {
    message: `status must be one of: ${QUOTE_STATUSES.join(', ')}`,
  })
  status?: QuoteStatus;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Inclusive lower quote date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fromDate must be YYYY-MM-DD' })
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'Inclusive upper quote date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'toDate must be YYYY-MM-DD' })
  toDate?: string;
}
