import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { InterestLevel, InterestReason } from '../../domain/visit-interest.js';

/** Datos opcionales del próximo seguimiento, creados junto con el resultado de la visita (HU-09 CA-09 / HU-10). */
export class NextFollowUpDto {
  @ApiProperty({ example: '2026-10-25', description: 'Fecha próxima (YYYY-MM-DD)' })
  @IsDateString()
  nextDate!: string;

  @ApiPropertyOptional({ example: '09:00', description: 'Hora opcional (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'nextTime must be HH:mm' })
  nextTime?: string;

  @ApiProperty({ example: 'Enviar cotización', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  activity!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observation?: string;
}

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

  @ApiPropertyOptional({
    description: 'Próximo seguimiento opcional vinculado a esta visita.',
    type: () => NextFollowUpDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NextFollowUpDto)
  nextFollowUp?: NextFollowUpDto;
}
