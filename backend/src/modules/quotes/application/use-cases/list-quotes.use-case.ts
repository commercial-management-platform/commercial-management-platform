import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type {
  PageRequest,
  Paginated,
} from '../../../../shared/application/pagination.js';
import { ValidationError } from '../../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { QuoteStatus } from '../../domain/entities/quote-status.js';
import type { Quote } from '../../domain/entities/quote.js';
import type { QuoteRepositoryPort } from '../../domain/ports/quote.repository.port.js';
import type { QuoteActor } from '../types/quote-actor.js';

export interface ListQuotesInput {
  clientId?: number;
  advisorId?: number;
  status?: QuoteStatus;
  fromDate?: string;
  toDate?: string;
}

export class ListQuotesUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(
    actor: QuoteActor,
    filter: ListQuotesInput,
    page: PageRequest,
  ): Promise<Paginated<Quote>> {
    if (filter.fromDate && filter.toDate && filter.fromDate > filter.toDate) {
      throw new ValidationError('fromDate cannot be after toDate');
    }
    const clientIds =
      actor.role === UserRole.Advisor
        ? await this.advisorAccess.getAccessibleClientIds(actor.id)
        : undefined;
    const result = await this.quotes.findPage({ ...filter, clientIds }, page);
    return { data: result.items, total: result.total, ...page };
  }
}
