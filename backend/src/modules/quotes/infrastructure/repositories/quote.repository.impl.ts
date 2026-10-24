import { Injectable } from '@nestjs/common';

import type { PageRequest } from '../../../../shared/application/pagination.js';
import type {
  QuoteFilterOptions,
  QuoteRepositoryPort,
} from '../../domain/ports/quote.repository.port.js';
import type { QuoteStatus } from '../../domain/entities/quote-status.js';
import type { Quote } from '../../domain/entities/quote.js';
import { QuoteMapper } from '../mappers/quote.mapper.js';
import { QuoteDao } from '../persistence/daos/quote.dao.js';

/** Maps the domain port to the persistence DAO; it has no ORM dependency. */
@Injectable()
export class QuoteRepositoryImpl implements QuoteRepositoryPort {
  constructor(private readonly dao: QuoteDao) {}

  async create(quote: Quote): Promise<Quote> {
    return QuoteMapper.toDomain(
      await this.dao.create(QuoteMapper.toPersistence(quote)),
    );
  }

  async findById(id: number): Promise<Quote | null> {
    const entity = await this.dao.findById(id);
    return entity ? QuoteMapper.toDomain(entity) : null;
  }

  async findPage(filter: QuoteFilterOptions, page: PageRequest) {
    const result = await this.dao.findPage(filter, page);
    return {
      items: result.items.map(QuoteMapper.toDomain),
      total: result.total,
    };
  }

  async updateStatusIfCurrent(
    id: number,
    status: QuoteStatus,
    expected: QuoteStatus,
  ): Promise<Quote | null> {
    const entity = await this.dao.updateStatusIfCurrent(id, status, expected);
    return entity ? QuoteMapper.toDomain(entity) : null;
  }

  async updateDocumentKey(
    id: number,
    documentKey: string,
  ): Promise<Quote | null> {
    const entity = await this.dao.updateDocumentKey(id, documentKey);
    return entity ? QuoteMapper.toDomain(entity) : null;
  }
}
