import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  type PageRequest,
} from '../../application/pagination.js';

/**
 * Standard pagination query. Extend it in the list query DTO of each
 * endpoint and pass `toPageRequest()` to the use case.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;

  toPageRequest(): PageRequest {
    return {
      page: this.page ?? DEFAULT_PAGE,
      limit: this.limit ?? DEFAULT_LIMIT,
    };
  }
}
