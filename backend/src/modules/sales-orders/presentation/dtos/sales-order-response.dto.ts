import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SalesOrder } from '../../domain/entities/sales-order.js';
import {
  SALES_ORDER_STATUSES,
  type SalesOrderStatus,
} from '../../domain/entities/sales-order-status.js';

export class SalesOrderResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'PED-0001' }) number: string;
  @ApiProperty({ example: 10 }) clientId: number;
  @ApiPropertyOptional({ type: Number, nullable: true, example: 4 }) quoteId:
    number | null;
  @ApiPropertyOptional({ type: Number, nullable: true, example: 45 }) visitId:
    number | null;
  @ApiProperty({ example: 2 }) advisorId: number;
  @ApiProperty({ example: '2026-10-23' }) date: string;
  @ApiProperty({
    example: '125000.500000',
    description: 'Exact decimal string',
  })
  value: string;
  @ApiProperty({ enum: SALES_ORDER_STATUSES, example: 'pending' })
  status: SalesOrderStatus;
  @ApiProperty({ example: '2026-10-30' }) estimatedDeliveryDate: string;
  @ApiProperty({ example: '2026-10-23T14:00:00.000Z' }) createdAt: Date;
  @ApiProperty({ example: '2026-10-23T14:00:00.000Z' }) updatedAt: Date;
  static fromDomain(order: SalesOrder): SalesOrderResponseDto {
    return Object.assign(new SalesOrderResponseDto(), {
      id: order.id!,
      number: order.number!,
      clientId: order.clientId,
      quoteId: order.quoteId,
      visitId: order.visitId,
      advisorId: order.advisorId,
      date: order.date,
      value: order.value,
      status: order.status,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      createdAt: order.createdAt!,
      updatedAt: order.updatedAt!,
    });
  }
}
