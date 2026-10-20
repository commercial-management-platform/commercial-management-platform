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
import { DATE_ONLY, TIME_HH_MM } from './create-route.dto.js';

export class UpdateRouteDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  zoneId?: number;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  advisorId?: number;

  @ApiProperty({ required: false, example: '2026-01-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

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
