import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

import {
  QUOTE_INPUT_DECIMAL_MESSAGE,
  QUOTE_INPUT_DECIMAL_PATTERN,
} from '../../domain/entities/quote-decimal.js';

export class CreateQuoteDetailDto {
  @ApiProperty({ example: 'Premium cleaning service' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  product: string;

  @ApiProperty({
    example: '2.500',
    description: 'Positive decimal, up to three decimal places',
  })
  @IsString()
  @Matches(QUOTE_INPUT_DECIMAL_PATTERN, {
    message: `quantity ${QUOTE_INPUT_DECIMAL_MESSAGE}`,
  })
  quantity: string;

  @ApiProperty({
    example: '12500.000',
    description: 'Non-negative decimal, up to three decimal places',
  })
  @IsString()
  @Matches(QUOTE_INPUT_DECIMAL_PATTERN, {
    message: `price ${QUOTE_INPUT_DECIMAL_MESSAGE}`,
  })
  price: string;
}
