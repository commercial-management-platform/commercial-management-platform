import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional } from 'class-validator';

export class ScheduleVisitDto {
  @ApiProperty()
  @IsInt()
  clientId!: number;

  @ApiProperty()
  @IsInt()
  advisorId!: number;

  @ApiProperty({
    example: '2026-01-15T08:00:00-05:00',
    description: 'ISO 8601 date and time with time zone. Cannot be in the past.',
  })
  @IsISO8601({ strict: true })
  scheduledDate!: string;

  @ApiProperty({
    required: false,
    description: 'Route the visit belongs to; the client must be on it',
  })
  @IsOptional()
  @IsInt()
  routeId?: number;
}
