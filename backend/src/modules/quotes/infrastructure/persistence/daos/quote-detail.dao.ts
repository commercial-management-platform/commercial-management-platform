import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { calculateTotal } from '../../../domain/entities/quote-decimal.js';
import { assertQuoteDetailsEditable } from '../../../domain/entities/quote-status.js';
import { QuoteDetailOrmEntity } from '../entities/quote-detail.orm-entity.js';
import { QuoteOrmEntity } from '../entities/quote.orm-entity.js';

/** Owns every TypeORM operation that mutates a detail and its quote total. */
@Injectable()
export class QuoteDetailDao {
  constructor(
    @InjectRepository(QuoteDetailOrmEntity)
    private readonly detailRepository: Repository<QuoteDetailOrmEntity>,
  ) {}

  findByQuoteId(quoteId: number): Promise<QuoteDetailOrmEntity[]> {
    return this.detailRepository.find({
      where: { quoteId },
      order: { id: 'ASC' },
    });
  }

  findById(
    quoteId: number,
    detailId: number,
  ): Promise<QuoteDetailOrmEntity | null> {
    return this.detailRepository.findOne({ where: { id: detailId, quoteId } });
  }

  async add(
    quoteId: number,
    detail: QuoteDetailOrmEntity,
  ): Promise<QuoteDetailOrmEntity | null> {
    return this.detailRepository.manager.transaction(async (manager) => {
      const quote = await this.lockQuote(
        manager.getRepository(QuoteOrmEntity),
        quoteId,
      );
      if (!quote) return null;
      const savedDetail = await manager.save(QuoteDetailOrmEntity, detail);
      await this.updateTotal(
        quote,
        manager.getRepository(QuoteDetailOrmEntity),
      );
      return savedDetail;
    });
  }

  async update(
    quoteId: number,
    detail: QuoteDetailOrmEntity,
  ): Promise<QuoteDetailOrmEntity | null> {
    return this.detailRepository.manager.transaction(async (manager) => {
      const quote = await this.lockQuote(
        manager.getRepository(QuoteOrmEntity),
        quoteId,
      );
      if (!quote) return null;
      const current = await manager.findOne(QuoteDetailOrmEntity, {
        where: { id: detail.id, quoteId },
      });
      if (!current) return null;
      current.quantity = detail.quantity;
      current.price = detail.price;
      current.subtotal = detail.subtotal;
      const savedDetail = await manager.save(QuoteDetailOrmEntity, current);
      await this.updateTotal(
        quote,
        manager.getRepository(QuoteDetailOrmEntity),
      );
      return savedDetail;
    });
  }

  async remove(
    quoteId: number,
    detailId: number,
  ): Promise<QuoteDetailOrmEntity | null> {
    return this.detailRepository.manager.transaction(async (manager) => {
      const quote = await this.lockQuote(
        manager.getRepository(QuoteOrmEntity),
        quoteId,
      );
      if (!quote) return null;
      const detail = await manager.findOne(QuoteDetailOrmEntity, {
        where: { id: detailId, quoteId },
      });
      if (!detail) return null;
      await manager.remove(QuoteDetailOrmEntity, detail);
      await this.updateTotal(
        quote,
        manager.getRepository(QuoteDetailOrmEntity),
      );
      return detail;
    });
  }

  private lockQuote(
    repository: Repository<QuoteOrmEntity>,
    quoteId: number,
  ): Promise<QuoteOrmEntity | null> {
    return repository.findOne({
      where: { id: quoteId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private async updateTotal(
    quote: QuoteOrmEntity,
    details: Repository<QuoteDetailOrmEntity>,
  ): Promise<void> {
    const allDetails = await details.find({
      where: { quoteId: quote.id },
      order: { id: 'ASC' },
    });
    assertQuoteDetailsEditable(quote.status);
    quote.value = calculateTotal(allDetails.map((detail) => detail.subtotal));
    await details.manager.save(QuoteOrmEntity, quote);
  }
}
