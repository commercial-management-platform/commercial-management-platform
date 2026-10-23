import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { QuoteDetail } from '../../domain/entities/quote-detail.js';
import type { QuoteDetailRepositoryPort } from '../../domain/ports/quote-detail.repository.port.js';
import type { QuoteRepositoryPort } from '../../domain/ports/quote.repository.port.js';
import { loadEditableQuote } from '../quote-visibility.js';
import type { QuoteActor } from '../types/quote-actor.js';

export class UpdateQuoteDetailUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly details: QuoteDetailRepositoryPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(
    actor: QuoteActor,
    quoteId: number,
    detailId: number,
    input: { quantity?: string; price?: string },
  ): Promise<QuoteDetail> {
    await loadEditableQuote(this.quotes, actor, this.advisorAccess, quoteId);
    const detail = await this.details.findDetailById(quoteId, detailId);
    if (!detail)
      throw new NotFoundError(`Quote detail with id '${detailId}' not found`);
    detail.update(input);
    const updated = await this.details.update(quoteId, detail);
    if (!updated)
      throw new NotFoundError(`Quote detail with id '${detailId}' not found`);
    return updated;
  }
}
