import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import type { ActivityLogPort } from '../../../../shared/application/ports/activity-log.port.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import { Quote } from '../../domain/entities/quote.js';
import type { QuoteReferencesPort } from '../../domain/ports/quote-references.port.js';
import type { QuoteRepositoryPort } from '../../domain/ports/quote.repository.port.js';
import type { QuoteActor } from '../types/quote-actor.js';

export interface CreateQuoteInput {
  actor: QuoteActor;
  clientId: number;
  /** Required only for admin/director; advisors are resolved from their session. */
  advisorId?: number;
  visitId?: number | null;
  date: string;
  currency?: string;
}

export class CreateQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly references: QuoteReferencesPort,
    private readonly advisorAccess: AdvisorClientAccessPort,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(input: CreateQuoteInput): Promise<Quote> {
    assertDate(input.date);
    const currency = (input.currency ?? 'COP').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new ValidationError('currency must be a three-letter ISO code');
    }

    const advisorId = await this.resolveAdvisorId(input);
    const client = await this.references.findClient(input.clientId);
    if (!client || !client.active) {
      throw new NotFoundError(`Client with id '${input.clientId}' not found`);
    }
    if (
      input.actor.role === UserRole.Advisor &&
      !(await this.advisorAccess.canAccess(input.actor.id, input.clientId))
    ) {
      throw new NotFoundError(`Client with id '${input.clientId}' not found`);
    }

    const visitId = input.visitId ?? null;
    if (visitId !== null) {
      const visit = await this.references.findVisit(visitId);
      if (!visit)
        throw new NotFoundError(`Visit with id '${visitId}' not found`);
      if (visit.clientId !== input.clientId || visit.advisorId !== advisorId) {
        throw new ValidationError(
          'visitId must reference a visit of the same client and advisor',
        );
      }
    }

    const quote = await this.quotes.create(
      Quote.create({
        clientId: input.clientId,
        advisorId,
        visitId,
        date: input.date,
        currency,
      }),
    );
    await this.activityLog.record({
      action: 'quote.created',
      userId: input.actor.id,
      clientId: quote.clientId,
      description: `Quote '${quote.number}' created`,
      occurredAt: new Date(),
    });
    return quote;
  }

  private async resolveAdvisorId(input: CreateQuoteInput): Promise<number> {
    if (input.actor.role === UserRole.Advisor) {
      const advisor = await this.references.findAdvisorByUserId(input.actor.id);
      if (!advisor || !advisor.active) {
        throw new ForbiddenError(
          'The session user has no active advisor profile',
        );
      }
      if (input.advisorId !== undefined && input.advisorId !== advisor.id) {
        throw new ForbiddenError('An advisor can only create their own quotes');
      }
      return advisor.id;
    }

    if (input.advisorId === undefined) {
      throw new ValidationError('advisorId is required for admin and director');
    }
    const advisor = await this.references.findAdvisor(input.advisorId);
    if (!advisor || !advisor.active) {
      throw new NotFoundError(`Advisor with id '${input.advisorId}' not found`);
    }
    return advisor.id;
  }
}

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError('date must be YYYY-MM-DD');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new ValidationError('date must be a valid calendar date');
  }
}
