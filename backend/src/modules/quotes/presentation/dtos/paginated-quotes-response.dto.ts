import { ApiProperty } from '@nestjs/swagger';
import type { Paginated } from '../../../../shared/application/pagination.js';
import type { Quote } from '../../domain/entities/quote.js';
import { QuoteResponseDto } from './quote-response.dto.js';

export class PaginatedQuotesResponseDto {
  @ApiProperty({ type: [QuoteResponseDto] })
  data: QuoteResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  static fromDomain(page: Paginated<Quote>): PaginatedQuotesResponseDto {
    return Object.assign(new PaginatedQuotesResponseDto(), {
      data: page.data.map(QuoteResponseDto.fromDomain),
      total: page.total,
      page: page.page,
      limit: page.limit,
    });
  }
}
