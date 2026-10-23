import { ApiProperty } from '@nestjs/swagger';
import type { Paginated } from '../../../../shared/application/pagination.js';
import type { SalesOrder } from '../../domain/entities/sales-order.js';
import { SalesOrderResponseDto } from './sales-order-response.dto.js';

export class PaginatedSalesOrdersResponseDto {
  @ApiProperty({ type: [SalesOrderResponseDto] }) data: SalesOrderResponseDto[];
  @ApiProperty({ example: 42 }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
  static fromDomain(
    page: Paginated<SalesOrder>,
  ): PaginatedSalesOrdersResponseDto {
    return Object.assign(new PaginatedSalesOrdersResponseDto(), {
      data: page.data.map(SalesOrderResponseDto.fromDomain),
      total: page.total,
      page: page.page,
      limit: page.limit,
    });
  }
}
