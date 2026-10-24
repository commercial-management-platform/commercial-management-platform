import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { StoragePort } from '../../../../shared/application/ports/storage.port.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { QuoteRepositoryPort } from '../../domain/ports/quote.repository.port.js';
import { assertQuoteVisible } from '../quote-visibility.js';
import type { QuoteActor } from '../types/quote-actor.js';

/**
 * Devuelve una URL firmada de corta duración para ver el documento de la
 * cotización. Solo la obtiene quien puede ver la cotización (CA-07).
 */
export class GetQuoteDocumentUrlUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
    private readonly storage: StoragePort,
  ) {}

  async execute(actor: QuoteActor, quoteId: number): Promise<string> {
    const quote = await assertQuoteVisible(
      await this.quotes.findById(quoteId),
      actor,
      this.advisorAccess,
      quoteId,
    );
    if (!quote.documentKey) {
      throw new NotFoundError(`Quote with id '${quoteId}' has no document`);
    }
    return this.storage.getSignedUrl(quote.documentKey);
  }
}
