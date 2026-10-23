import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { QuoteDetailRepositoryPort } from '../../domain/ports/quote-detail.repository.port.js';
import type { QuoteRepositoryPort } from '../../domain/ports/quote.repository.port.js';
import { loadEditableQuote } from '../quote-visibility.js';
import type { QuoteActor } from '../types/quote-actor.js';

export class RemoveQuoteDetailUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly details: QuoteDetailRepositoryPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(
    actor: QuoteActor,
    quoteId: number,
    detailId: number,
  ): Promise<void> {
    await loadEditableQuote(this.quotes, actor, this.advisorAccess, quoteId);
    if (!(await this.details.remove(quoteId, detailId))) {
      throw new NotFoundError(`Quote detail with id '${detailId}' not found`);
    }
  }
}
