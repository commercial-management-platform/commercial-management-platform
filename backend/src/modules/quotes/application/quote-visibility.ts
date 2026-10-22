import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../clients/application/ports/advisor-client-access.port.js';
import type { Quote } from '../domain/entities/quote.js';
import type { QuoteActor } from './types/quote-actor.js';

/** Hides quotes outside an advisor's routes, just like clients and contacts. */
export async function assertQuoteVisible(
  quote: Quote | null,
  actor: QuoteActor,
  advisorAccess: AdvisorClientAccessPort,
  id: number,
): Promise<Quote> {
  if (
    !quote ||
    (actor.role === UserRole.Advisor &&
      !(await advisorAccess.canAccess(actor.id, quote.clientId)))
  ) {
    throw new NotFoundError(`Quote with id '${id}' not found`);
  }
  return quote;
}
