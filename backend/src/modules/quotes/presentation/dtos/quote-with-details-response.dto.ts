import { ApiProperty } from '@nestjs/swagger';
import type { Quote } from '../../domain/entities/quote.js';
import type { QuoteDetail } from '../../domain/entities/quote-detail.js';
import { QuoteResponseDto } from './quote-response.dto.js';
import { QuoteDetailResponseDto } from './quote-detail-response.dto.js';

export class QuoteWithDetailsResponseDto extends QuoteResponseDto {
  @ApiProperty({ type: [QuoteDetailResponseDto], example: [] })
  details: QuoteDetailResponseDto[];

  static fromDomain(
    quote: Quote,
    details: QuoteDetail[] = [],
  ): QuoteWithDetailsResponseDto {
    return Object.assign(
      new QuoteWithDetailsResponseDto(),
      QuoteResponseDto.fromDomain(quote),
      {
        details: details.map((detail) =>
          QuoteDetailResponseDto.fromDomain(detail),
        ),
      },
    );
  }
}
