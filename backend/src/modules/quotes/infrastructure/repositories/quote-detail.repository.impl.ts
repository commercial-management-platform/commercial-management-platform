import { Injectable } from '@nestjs/common';

import type { QuoteDetail } from '../../domain/entities/quote-detail.js';
import type { QuoteDetailRepositoryPort } from '../../domain/ports/quote-detail.repository.port.js';
import { QuoteDetailMapper } from '../mappers/quote-detail.mapper.js';
import { QuoteDetailDao } from '../persistence/daos/quote-detail.dao.js';

@Injectable()
export class QuoteDetailRepositoryImpl implements QuoteDetailRepositoryPort {
  constructor(private readonly dao: QuoteDetailDao) {}

  async findByQuoteId(quoteId: number): Promise<QuoteDetail[]> {
    return (await this.dao.findByQuoteId(quoteId)).map((entity) =>
      QuoteDetailMapper.toDomain(entity),
    );
  }

  async findDetailById(
    quoteId: number,
    detailId: number,
  ): Promise<QuoteDetail | null> {
    const entity = await this.dao.findById(quoteId, detailId);
    return entity ? QuoteDetailMapper.toDomain(entity) : null;
  }

  async add(quoteId: number, detail: QuoteDetail): Promise<QuoteDetail | null> {
    const entity = await this.dao.add(
      quoteId,
      QuoteDetailMapper.toPersistence(detail),
    );
    return entity ? QuoteDetailMapper.toDomain(entity) : null;
  }

  async update(
    quoteId: number,
    detail: QuoteDetail,
  ): Promise<QuoteDetail | null> {
    const entity = await this.dao.update(
      quoteId,
      QuoteDetailMapper.toPersistence(detail),
    );
    return entity ? QuoteDetailMapper.toDomain(entity) : null;
  }

  async remove(quoteId: number, detailId: number): Promise<boolean> {
    return (await this.dao.remove(quoteId, detailId)) !== null;
  }
}
