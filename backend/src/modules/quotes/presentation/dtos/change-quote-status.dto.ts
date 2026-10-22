import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  QUOTE_STATUSES,
  type QuoteStatus,
} from '../../domain/entities/quote-status.js';

export class ChangeQuoteStatusDto {
  @ApiProperty({
    enum: QUOTE_STATUSES,
    example: 'sent',
    description:
      'The requested state; allowed transitions are enforced by the domain',
  })
  @IsIn(QUOTE_STATUSES, {
    message: `status must be one of: ${QUOTE_STATUSES.join(', ')}`,
  })
  status: QuoteStatus;
}
