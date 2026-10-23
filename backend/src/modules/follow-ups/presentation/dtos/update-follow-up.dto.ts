import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFollowUpDto {
  @ApiPropertyOptional({ example: '2026-10-26' })
  @IsOptional()
  @IsDateString()
  nextDate?: string;

  @ApiPropertyOptional({ example: 'Llamar para seguimiento' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  activity?: string;

  @ApiPropertyOptional({ example: 'Se agenda llamada' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observation?: string;
}
