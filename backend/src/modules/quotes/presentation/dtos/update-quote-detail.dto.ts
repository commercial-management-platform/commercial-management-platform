import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

import {
  QUOTE_INPUT_DECIMAL_MESSAGE,
  QUOTE_INPUT_DECIMAL_PATTERN,
} from '../../domain/entities/quote-decimal.js';

export class UpdateQuoteDetailDto {
  @ApiPropertyOptional({ example: '3.000' })
  @IsOptional()
  @IsString()
  @Matches(QUOTE_INPUT_DECIMAL_PATTERN, {
    message: `quantity ${QUOTE_INPUT_DECIMAL_MESSAGE}`,
  })
  quantity?: string;

  @ApiPropertyOptional({ example: '13000.500' })
  @IsOptional()
  @IsString()
  @Matches(QUOTE_INPUT_DECIMAL_PATTERN, {
    message: `price ${QUOTE_INPUT_DECIMAL_MESSAGE}`,
  })
  price?: string;
}
