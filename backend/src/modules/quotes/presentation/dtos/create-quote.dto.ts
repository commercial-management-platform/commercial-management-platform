import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty({ example: 10, description: 'Existing active client id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientId: number;

  @ApiPropertyOptional({
    example: 2,
    description:
      'Required for admin/director. Ignored only when it equals the session advisor for advisor users.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  advisorId?: number;

  @ApiPropertyOptional({
    example: 45,
    nullable: true,
    description:
      'Optional visit that generated this quote; it must match client and advisor',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  visitId?: number;

  @ApiProperty({
    example: '2026-10-22',
    description: 'Quote date (YYYY-MM-DD)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @ApiPropertyOptional({
    example: 'COP',
    default: 'COP',
    description: 'Three-letter ISO currency code',
  })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, {
    message: 'currency must be a three-letter ISO code',
  })
  currency?: string;
}
