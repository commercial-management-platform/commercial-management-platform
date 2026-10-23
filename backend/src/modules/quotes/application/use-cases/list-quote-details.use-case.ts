import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { QuoteDetail } from '../../domain/entities/quote-detail.js';
import type { QuoteDetailRepositoryPort } from '../../domain/ports/quote-detail.repository.port.js';
import type { QuoteRepositoryPort } from '../../domain/ports/quote.repository.port.js';
import { assertQuoteVisible } from '../quote-visibility.js';
import type { QuoteActor } from '../types/quote-actor.js';

export class ListQuoteDetailsUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly details: QuoteDetailRepositoryPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(actor: QuoteActor, quoteId: number): Promise<QuoteDetail[]> {
    await assertQuoteVisible(
      await this.quotes.findById(quoteId),
      actor,
      this.advisorAccess,
      quoteId,
    );
    return this.details.findByQuoteId(quoteId);
  }
}
