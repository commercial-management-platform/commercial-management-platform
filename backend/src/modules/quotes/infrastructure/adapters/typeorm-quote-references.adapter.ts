import { Injectable } from '@nestjs/common';

import type {
  QuoteAdvisorReference,
  QuoteClientReference,
  QuoteReferencesPort,
  QuoteVisitReference,
} from '../../domain/ports/quote-references.port.js';
import { QuoteReferencesDao } from '../persistence/daos/quote-references.dao.js';

/** Minimal cross-module reads. Quote application code never accesses ORM models. */
@Injectable()
export class TypeOrmQuoteReferencesAdapter implements QuoteReferencesPort {
  constructor(private readonly dao: QuoteReferencesDao) {}

  async findClient(clientId: number): Promise<QuoteClientReference | null> {
    return this.dao.findClient(clientId);
  }

  async findAdvisor(advisorId: number): Promise<QuoteAdvisorReference | null> {
    return this.dao.findAdvisor(advisorId);
  }

  async findAdvisorByUserId(
    userId: string,
  ): Promise<QuoteAdvisorReference | null> {
    return this.dao.findAdvisorByUserId(userId);
  }

  async findVisit(visitId: number): Promise<QuoteVisitReference | null> {
    return this.dao.findVisit(visitId);
  }
}
