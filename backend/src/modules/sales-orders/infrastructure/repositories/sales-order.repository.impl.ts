import { Injectable } from '@nestjs/common';
import type {
  SalesOrderRepositoryPort,
  SalesOrderFilterOptions,
} from '../../domain/ports/sales-order.repository.port.js';
import type { SalesOrderStatus } from '../../domain/entities/sales-order-status.js';
import type { SalesOrder } from '../../domain/entities/sales-order.js';
import { SalesOrderMapper } from '../mappers/sales-order.mapper.js';
import { SalesOrderDao } from '../persistence/daos/sales-order.dao.js';

@Injectable()
export class SalesOrderRepositoryImpl implements SalesOrderRepositoryPort {
  constructor(private readonly dao: SalesOrderDao) {}
  async create(order: SalesOrder): Promise<SalesOrder> {
    return SalesOrderMapper.toDomain(
      await this.dao.create(SalesOrderMapper.toPersistence(order)),
    );
  }
  async findById(id: number): Promise<SalesOrder | null> {
    const entity = await this.dao.findById(id);
    return entity ? SalesOrderMapper.toDomain(entity) : null;
  }
  async findByQuoteId(quoteId: number): Promise<SalesOrder | null> {
    const entity = await this.dao.findByQuoteId(quoteId);
    return entity ? SalesOrderMapper.toDomain(entity) : null;
  }
  async findPage(
    filter: SalesOrderFilterOptions,
    page: Parameters<SalesOrderRepositoryPort['findPage']>[1],
  ) {
    const result = await this.dao.findPage(filter, page);
    return {
      items: result.items.map(SalesOrderMapper.toDomain),
      total: result.total,
    };
  }
  async updateStatusIfCurrent(
    id: number,
    status: SalesOrderStatus,
    expected: SalesOrderStatus,
  ): Promise<SalesOrder | null> {
    const entity = await this.dao.updateStatusIfCurrent(id, status, expected);
    return entity ? SalesOrderMapper.toDomain(entity) : null;
  }
}
