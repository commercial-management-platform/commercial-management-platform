import { ApiProperty } from '@nestjs/swagger';
import type { QuoteDetail } from '../../domain/entities/quote-detail.js';

export class QuoteDetailResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  quoteId: number;

  @ApiProperty({ example: 'Premium cleaning service' })
  product: string;

  @ApiProperty({ example: '2.500' })
  quantity: string;

  @ApiProperty({ example: '12500.000' })
  price: string;

  @ApiProperty({
    example: '31250.000000',
    description: 'Calculated by the backend',
  })
  subtotal: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromDomain(detail: QuoteDetail): QuoteDetailResponseDto {
    return Object.assign(new QuoteDetailResponseDto(), {
      id: detail.id!,
      quoteId: detail.quoteId,
      product: detail.product,
      quantity: detail.quantity,
      price: detail.price,
      subtotal: detail.subtotal,
      createdAt: detail.createdAt!,
      updatedAt: detail.updatedAt!,
    });
  }
}
