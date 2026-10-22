import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { PageRequest } from '../../../../../shared/application/pagination.js';
import { pageOffset } from '../../../../../shared/application/pagination.js';
import type { QuoteStatus } from '../../../domain/entities/quote-status.js';
import { QuoteOrmEntity } from '../entities/quote.orm-entity.js';

export interface QuoteDaoFilter {
  clientId?: number;
  advisorId?: number;
  status?: QuoteStatus;
  fromDate?: string;
  toDate?: string;
  clientIds?: number[];
}

/** The sole quote component (besides its ORM entity) allowed to use TypeORM. */
@Injectable()
export class QuoteDao {
  constructor(
    @InjectRepository(QuoteOrmEntity)
    private readonly repository: Repository<QuoteOrmEntity>,
  ) {}

  async create(entity: QuoteOrmEntity): Promise<QuoteOrmEntity> {
    return this.repository.manager.transaction(async (manager) => {
      const rows: { value: string | number }[] = await manager.query(
        `SELECT nextval('"quote_number_seq"') AS value`,
      );
      const sequence = String(rows[0].value);
      entity.number = `COT-${sequence.padStart(4, '0')}`;
      return manager.save(QuoteOrmEntity, entity);
    });
  }

  findById(id: number): Promise<QuoteOrmEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findPage(
    filter: QuoteDaoFilter,
    page: PageRequest,
  ): Promise<{ items: QuoteOrmEntity[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('quote')
      .orderBy('quote.date', 'DESC')
      .addOrderBy('quote.id', 'DESC')
      .skip(pageOffset(page))
      .take(page.limit);

    if (filter.clientIds !== undefined) {
      if (filter.clientIds.length === 0) return { items: [], total: 0 };
      qb.andWhere('quote.clientId IN (:...clientIds)', {
        clientIds: filter.clientIds,
      });
    }
    if (filter.clientId !== undefined) {
      qb.andWhere('quote.clientId = :clientId', { clientId: filter.clientId });
    }
    if (filter.advisorId !== undefined) {
      qb.andWhere('quote.advisorId = :advisorId', {
        advisorId: filter.advisorId,
      });
    }
    if (filter.status !== undefined) {
      qb.andWhere('quote.status = :status', { status: filter.status });
    }
    if (filter.fromDate !== undefined) {
      qb.andWhere('quote.date >= :fromDate', { fromDate: filter.fromDate });
    }
    if (filter.toDate !== undefined) {
      qb.andWhere('quote.date <= :toDate', { toDate: filter.toDate });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateStatusIfCurrent(
    id: number,
    status: QuoteStatus,
    expected: QuoteStatus,
  ): Promise<QuoteOrmEntity | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update(QuoteOrmEntity)
      .set({ status })
      .where('id = :id AND status = :expected', { id, expected })
      .execute();
    return result.affected === 1 ? this.findById(id) : null;
  }
}
