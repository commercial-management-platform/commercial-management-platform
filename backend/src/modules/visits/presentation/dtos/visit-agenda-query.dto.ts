import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

import { DATE_ONLY_PATTERN } from '../../../../shared/domain/time/business-time.js';

export class VisitAgendaQueryDto {
  @ApiPropertyOptional({
    enum: ['day', 'week'],
    default: 'day',
  })
  @IsOptional()
  @IsIn(['day', 'week'])
  period?: 'day' | 'week';

  @ApiPropertyOptional({
    example: '2026-01-15',
    description: 'Business-time date; defaults to today in Colombia',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}
