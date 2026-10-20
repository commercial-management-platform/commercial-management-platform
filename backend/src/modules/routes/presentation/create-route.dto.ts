import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { RouteStatus } from '../domain/route-status.js';

/** Calendar date only (no time), so it cannot be shifted by a time zone. */
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
/** 24-hour time, HH:mm. */
export const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateRouteDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsInt()
  zoneId!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  executionDays?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiProperty({ required: false, example: '08:00' })
  @IsOptional()
  @Matches(TIME_HH_MM, { message: 'suggestedStartTime must be HH:mm' })
  suggestedStartTime?: string;

  @ApiProperty({ required: false, example: '17:00' })
  @IsOptional()
  @Matches(TIME_HH_MM, { message: 'suggestedEndTime must be HH:mm' })
  suggestedEndTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsInt()
  advisorId!: number;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY, { message: 'startDate must be YYYY-MM-DD' })
  startDate!: string;

  @ApiProperty({ required: false, example: '2026-12-31' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;

  @ApiProperty({ required: false, enum: RouteStatus })
  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;
}
