import type { PageRequest } from '../../../../shared/application/pagination.js';
import type { SalesOrderStatus } from '../entities/sales-order-status.js';
import type { SalesOrder } from '../entities/sales-order.js';

export const SALES_ORDER_REPOSITORY = Symbol('SALES_ORDER_REPOSITORY');

export interface SalesOrderFilterOptions {
  clientId?: number;
  advisorId?: number;
  status?: SalesOrderStatus;
  fromDate?: string;
  toDate?: string;
  clientIds?: number[];
}

export interface SalesOrderRepositoryPort {
  create(order: SalesOrder): Promise<SalesOrder>;
  findById(id: number): Promise<SalesOrder | null>;
  findByQuoteId(quoteId: number): Promise<SalesOrder | null>;
  findPage(
    filter: SalesOrderFilterOptions,
    page: PageRequest,
  ): Promise<{ items: SalesOrder[]; total: number }>;
  updateStatusIfCurrent(
    id: number,
    status: SalesOrderStatus,
    expected: SalesOrderStatus,
  ): Promise<SalesOrder | null>;
}
