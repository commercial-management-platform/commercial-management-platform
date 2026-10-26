import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/presentation/dtos/pagination-query.dto.js';
import {
  SALES_ORDER_STATUSES,
  type SalesOrderStatus,
} from '../../domain/entities/sales-order-status.js';

export class ListSalesOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientId?: number;
  @ApiPropertyOptional({ type: Number, example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  advisorId?: number;
  @ApiPropertyOptional({ enum: SALES_ORDER_STATUSES, example: 'confirmed' })
  @IsOptional()
  @IsIn(SALES_ORDER_STATUSES, {
    message: `status must be one of: ${SALES_ORDER_STATUSES.join(', ')}`,
  })
  status?: SalesOrderStatus;
  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Inclusive lower order date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fromDate must be YYYY-MM-DD' })
  fromDate?: string;
  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'Inclusive upper order date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'toDate must be YYYY-MM-DD' })
  toDate?: string;
}
