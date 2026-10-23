import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictError } from '../../../../../shared/domain/errors/index.js';
import type { PageRequest } from '../../../../../shared/application/pagination.js';
import { pageOffset } from '../../../../../shared/application/pagination.js';
import type { SalesOrderStatus } from '../../../domain/entities/sales-order-status.js';
import { SalesOrderOrmEntity } from '../entities/sales-order.orm-entity.js';

export interface SalesOrderDaoFilter {
  clientId?: number;
  advisorId?: number;
  status?: SalesOrderStatus;
  fromDate?: string;
  toDate?: string;
  clientIds?: number[];
}

@Injectable()
export class SalesOrderDao {
  constructor(
    @InjectRepository(SalesOrderOrmEntity)
    private readonly repository: Repository<SalesOrderOrmEntity>,
  ) {}

  async create(entity: SalesOrderOrmEntity): Promise<SalesOrderOrmEntity> {
    try {
      return await this.repository.manager.transaction(async (manager) => {
        const rows: { value: string | number }[] = await manager.query(
          `SELECT nextval('"sales_order_number_seq"') AS value`,
        );
        entity.number = `PED-${String(rows[0].value).padStart(4, '0')}`;
        return manager.save(SalesOrderOrmEntity, entity);
      });
    } catch (error: unknown) {
      if (isQuoteUniqueViolation(error))
        throw new ConflictError(
          `Quote with id '${entity.quoteId}' already has a sales order`,
        );
      throw error;
    }
  }

  findById(id: number): Promise<SalesOrderOrmEntity | null> {
    return this.repository.findOne({ where: { id } });
  }
  findByQuoteId(quoteId: number): Promise<SalesOrderOrmEntity | null> {
    return this.repository.findOne({ where: { quoteId } });
  }

  async findPage(
    filter: SalesOrderDaoFilter,
    page: PageRequest,
  ): Promise<{ items: SalesOrderOrmEntity[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('sales_order')
      .orderBy('sales_order.date', 'DESC')
      .addOrderBy('sales_order.id', 'DESC')
      .skip(pageOffset(page))
      .take(page.limit);
    if (filter.clientIds !== undefined) {
      if (filter.clientIds.length === 0) return { items: [], total: 0 };
      qb.andWhere('sales_order.clientId IN (:...clientIds)', {
        clientIds: filter.clientIds,
      });
    }
    if (filter.clientId !== undefined)
      qb.andWhere('sales_order.clientId = :clientId', {
        clientId: filter.clientId,
      });
    if (filter.advisorId !== undefined)
      qb.andWhere('sales_order.advisorId = :advisorId', {
        advisorId: filter.advisorId,
      });
    if (filter.status !== undefined)
      qb.andWhere('sales_order.status = :status', { status: filter.status });
    if (filter.fromDate !== undefined)
      qb.andWhere('sales_order.date >= :fromDate', {
        fromDate: filter.fromDate,
      });
    if (filter.toDate !== undefined)
      qb.andWhere('sales_order.date <= :toDate', { toDate: filter.toDate });
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateStatusIfCurrent(
    id: number,
    status: SalesOrderStatus,
    expected: SalesOrderStatus,
  ): Promise<SalesOrderOrmEntity | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update(SalesOrderOrmEntity)
      .set({ status })
      .where('id = :id AND status = :expected', { id, expected })
      .execute();
    return result.affected === 1 ? this.findById(id) : null;
  }
}

function isQuoteUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505' &&
    'constraint' in error &&
    (error as { constraint?: string }).constraint === 'UQ_sales_order_quote_id'
  );
}
