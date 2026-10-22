import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class RescheduleVisitDto {
  @ApiProperty({
    example: '2026-01-16T09:00:00-05:00',
    description: 'ISO 8601 date and time with time zone. Cannot be in the past.',
  })
  @IsISO8601({ strict: true })
  scheduledDate!: string;
}
