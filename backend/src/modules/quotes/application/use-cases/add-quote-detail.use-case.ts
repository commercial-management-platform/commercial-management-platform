import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import { QuoteDetail } from '../../domain/entities/quote-detail.js';
import type { QuoteDetailRepositoryPort } from '../../domain/ports/quote-detail.repository.port.js';
import type { QuoteRepositoryPort } from '../../domain/ports/quote.repository.port.js';
import { loadEditableQuote } from '../quote-visibility.js';
import type { QuoteActor } from '../types/quote-actor.js';

export class AddQuoteDetailUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly details: QuoteDetailRepositoryPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(
    actor: QuoteActor,
    quoteId: number,
    input: { product: string; quantity: string; price: string },
  ): Promise<QuoteDetail> {
    await loadEditableQuote(this.quotes, actor, this.advisorAccess, quoteId);
    const detail = QuoteDetail.create({ quoteId, ...input });
    const saved = await this.details.add(quoteId, detail);
    if (!saved) throw new NotFoundError(`Quote with id '${quoteId}' not found`);
    return saved;
  }
}
