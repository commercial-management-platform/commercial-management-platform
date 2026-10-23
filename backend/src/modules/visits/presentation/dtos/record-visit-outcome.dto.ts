import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { InterestLevel, InterestReason } from '../../domain/visit-interest.js';

export class RecordVisitOutcomeDto {
  @ApiProperty({ description: 'visit_objective catalog id' })
  @IsInt()
  visitObjectiveId!: number;

  @ApiProperty({ description: 'visit_type catalog id' })
  @IsInt()
  visitTypeId!: number;

  @ApiProperty({ description: 'visit_result catalog id' })
  @IsInt()
  visitResultId!: number;

  @ApiProperty({ enum: InterestLevel })
  @IsEnum(InterestLevel)
  interestLevel!: InterestLevel;

  @ApiPropertyOptional({ enum: InterestReason })
  @IsOptional()
  @IsEnum(InterestReason)
  interestReason?: InterestReason;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  observation!: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  competitorMentioned?: string;

  @ApiPropertyOptional({
    description:
      'Used only when the visit was never started with POST /visits/:id/start',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  startedAt?: string;

  @ApiPropertyOptional({
    description: 'Cannot be before startedAt',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  finishedAt?: string;
}
