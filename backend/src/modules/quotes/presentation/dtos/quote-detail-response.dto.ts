import { ApiProperty } from '@nestjs/swagger';
import type { Quote } from '../../domain/entities/quote.js';
import { QuoteResponseDto } from './quote-response.dto.js';

/** HU-13 will replace the empty details list with persisted quote_detail records. */
export class QuoteDetailResponseDto extends QuoteResponseDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    example: [],
    description: 'Empty until HU-13 implements quote details',
  })
  details: [];

  static fromDomain(quote: Quote): QuoteDetailResponseDto {
    return Object.assign(
      new QuoteDetailResponseDto(),
      QuoteResponseDto.fromDomain(quote),
      {
        details: [],
      },
    );
  }
}
