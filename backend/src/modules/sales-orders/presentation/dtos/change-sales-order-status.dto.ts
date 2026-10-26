import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  SALES_ORDER_STATUSES,
  type SalesOrderStatus,
} from '../../domain/entities/sales-order-status.js';

export class ChangeSalesOrderStatusDto {
  @ApiProperty({ enum: SALES_ORDER_STATUSES, example: 'confirmed' })
  @IsIn(SALES_ORDER_STATUSES, {
    message: `status must be one of: ${SALES_ORDER_STATUSES.join(', ')}`,
  })
  status: SalesOrderStatus;
}
