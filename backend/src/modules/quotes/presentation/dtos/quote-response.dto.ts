import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Quote } from '../../domain/entities/quote.js';
import {
  QUOTE_STATUSES,
  type QuoteStatus,
} from '../../domain/entities/quote-status.js';

export class QuoteResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'COT-0001' })
  number: string;

  @ApiProperty({ example: 10 })
  clientId: number;

  @ApiProperty({ example: 2 })
  advisorId: number;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 45 })
  visitId: number | null;

  @ApiProperty({ example: '2026-10-22' })
  date: string;

  @ApiProperty({
    example: '0.00',
    description: 'Decimal string, calculated from quote details in HU-13',
  })
  value: string;

  @ApiProperty({ example: 'COP' })
  currency: string;

  @ApiProperty({ enum: QUOTE_STATUSES, example: 'draft' })
  status: QuoteStatus;

  @ApiPropertyOptional({ nullable: true, example: null })
  documentKey: string | null;

  @ApiProperty({ example: '2026-10-22T14:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-22T14:00:00.000Z' })
  updatedAt: Date;

  static fromDomain(quote: Quote): QuoteResponseDto {
    const dto = new QuoteResponseDto();
    dto.id = quote.id!;
    dto.number = quote.number!;
    dto.clientId = quote.clientId;
    dto.advisorId = quote.advisorId;
    dto.visitId = quote.visitId;
    dto.date = quote.date;
    dto.value = quote.value;
    dto.currency = quote.currency;
    dto.status = quote.status;
    dto.documentKey = quote.documentKey;
    dto.createdAt = quote.createdAt!;
    dto.updatedAt = quote.updatedAt!;
    return dto;
  }
}
