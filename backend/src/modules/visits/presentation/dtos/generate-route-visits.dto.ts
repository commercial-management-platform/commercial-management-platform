import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

import {
  DATE_ONLY_PATTERN,
  TIME_HH_MM_PATTERN,
} from '../../../../shared/domain/time/business-time.js';

export class GenerateRouteVisitsDto {
  @ApiProperty({
    example: '2026-01-15',
    description: 'Calendar date (business time) the visits are scheduled for',
  })
  @Matches(DATE_ONLY_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({
    example: '08:00',
    description:
      "Used only when the route has no suggestedStartTime; otherwise it is ignored",
  })
  @IsOptional()
  @Matches(TIME_HH_MM_PATTERN, { message: 'time must be HH:mm' })
  time?: string;
}
