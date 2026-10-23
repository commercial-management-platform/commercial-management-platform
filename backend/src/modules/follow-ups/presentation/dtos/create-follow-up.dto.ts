import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateFollowUpDto {
  @ApiProperty({ example: '2026-10-25' })
  @IsDateString()
  nextDate!: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'nextTime must be HH:mm' })
  nextTime?: string;

  @ApiProperty({ example: 'Llamar para confirmar pedido' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  activity!: string;

  @ApiPropertyOptional({ example: 'Cliente interesado en cotización' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observation?: string;

  @ApiPropertyOptional({ example: 1, description: 'Responsible advisor id (if not provided, defaults to visit advisor)' })
  @IsOptional()
  @IsInt()
  responsibleAdvisorId?: number;
}
