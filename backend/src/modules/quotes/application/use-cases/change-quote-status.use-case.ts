import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { ActivityLogPort } from '../../../../shared/application/ports/activity-log.port.js';
import type { QuoteStatus } from '../../domain/entities/quote-status.js';
import type { Quote } from '../../domain/entities/quote.js';
import type { QuoteRepositoryPort } from '../../domain/ports/quote.repository.port.js';
import type { QuoteActor } from '../types/quote-actor.js';

export class ChangeQuoteStatusUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(
    actor: QuoteActor,
    id: number,
    status: QuoteStatus,
  ): Promise<Quote> {
    const quote = await this.quotes.findById(id);
    if (!quote) throw new NotFoundError(`Quote with id '${id}' not found`);

    const expected = quote.status;
    quote.changeStatus(status);
    const updated = await this.quotes.updateStatusIfCurrent(
      id,
      quote.status,
      expected,
    );
    if (!updated) {
      throw new NotFoundError(`Quote with id '${id}' was changed concurrently`);
    }
    await this.activityLog.record({
      action: 'quote.status_changed',
      userId: actor.id,
      clientId: updated.clientId,
      description: `Quote '${updated.number}' status changed from '${expected}' to '${updated.status}'`,
      occurredAt: new Date(),
    });
    return updated;
  }
}
