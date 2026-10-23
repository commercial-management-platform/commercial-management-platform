import type { QuoteDetail } from '../entities/quote-detail.js';

export const QUOTE_DETAIL_REPOSITORY = Symbol('QUOTE_DETAIL_REPOSITORY');

export interface QuoteDetailRepositoryPort {
  findByQuoteId(quoteId: number): Promise<QuoteDetail[]>;
  findDetailById(
    quoteId: number,
    detailId: number,
  ): Promise<QuoteDetail | null>;
  add(quoteId: number, detail: QuoteDetail): Promise<QuoteDetail | null>;
  update(quoteId: number, detail: QuoteDetail): Promise<QuoteDetail | null>;
  remove(quoteId: number, detailId: number): Promise<boolean>;
}
