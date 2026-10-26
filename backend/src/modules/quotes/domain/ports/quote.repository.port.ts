import type { PageRequest } from '../../../../shared/application/pagination.js';
import type { QuoteStatus } from '../entities/quote-status.js';
import type { Quote } from '../entities/quote.js';

export const QUOTE_REPOSITORY = Symbol('QUOTE_REPOSITORY');

export interface QuoteFilterOptions {
  clientId?: number;
  advisorId?: number;
  status?: QuoteStatus;
  fromDate?: string;
  toDate?: string;
  /** Restricts an advisor to the clients assigned to their routes. */
  clientIds?: number[];
}

export interface QuoteRepositoryPort {
  create(quote: Quote): Promise<Quote>;
  findById(id: number): Promise<Quote | null>;
  findPage(
    filter: QuoteFilterOptions,
    page: PageRequest,
  ): Promise<{ items: Quote[]; total: number }>;
  /** Optimistic state update so concurrent changes cannot overwrite one another. */
  updateStatusIfCurrent(
    id: number,
    status: QuoteStatus,
    expected: QuoteStatus,
  ): Promise<Quote | null>;
  /** Guarda la key del documento en S3 (HU-20). Devuelve null si la cotización no existe. */
  updateDocumentKey(id: number, documentKey: string): Promise<Quote | null>;
}
