import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { Quote } from '../../domain/entities/quote.js';
import type { QuoteRepositoryPort } from '../../domain/ports/quote.repository.port.js';
import { assertQuoteVisible } from '../quote-visibility.js';
import type { QuoteActor } from '../types/quote-actor.js';

export class GetQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(actor: QuoteActor, id: number): Promise<Quote> {
    return assertQuoteVisible(
      await this.quotes.findById(id),
      actor,
      this.advisorAccess,
      id,
    );
  }
}
