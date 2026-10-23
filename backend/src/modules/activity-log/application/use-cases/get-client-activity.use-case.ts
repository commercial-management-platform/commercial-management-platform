import type {
  PageRequest,
  Paginated,
} from '../../../../shared/application/pagination.js';
import type { ActivityAction } from '../../../../shared/domain/activity-log/activity-action.js';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import { businessDayRange } from '../../../../shared/domain/time/business-time.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { ActivityLogRecord } from '../../domain/entities/activity-log-record.js';
import type {
  ActivityLogFilter,
  ActivityLogRepository,
} from '../../domain/ports/activity-log.repository.js';
import type { ActivityLogActor } from '../types/activity-log-actor.js';

export interface GetClientActivityInput {
  actor: ActivityLogActor;
  clientId: number;
  action?: ActivityAction;
  /** First day included, YYYY-MM-DD in business time. */
  from?: string;
  /** Last day included, YYYY-MM-DD in business time. */
  to?: string;
}

/**
 * History of a client (HU-16), newest first. Admin and director see every
 * client; an advisor only the clients on their routes (CA-06).
 */
export class GetClientActivityUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly advisorAccess: AdvisorClientAccessPort,
    private readonly activityLog: ActivityLogRepository,
  ) {}

  async execute(
    input: GetClientActivityInput,
    page: PageRequest,
  ): Promise<Paginated<ActivityLogRecord>> {
    const filter = this.toFilter(input);

    const client = await this.clients.findById(input.clientId);
    if (
      !client ||
      (input.actor.role === UserRole.Advisor &&
        !(await this.advisorAccess.canAccess(input.actor.id, input.clientId)))
    ) {
      // Same answer for a client outside the advisor's routes, so it is not
      // revealed (404 instead of 403), as in the clients module.
      throw new NotFoundError(`Client with id '${input.clientId}' not found`);
    }

    const { items, total } = await this.activityLog.findPageByClient(
      input.clientId,
      filter,
      page,
    );
    return { data: items, total, page: page.page, limit: page.limit };
  }

  private toFilter(input: GetClientActivityInput): ActivityLogFilter {
    const from = input.from ? dayRange(input.from).start : undefined;
    const to = input.to ? dayRange(input.to).end : undefined;
    if (from && to && from.getTime() >= to.getTime()) {
      throw new ValidationError('from must be on or before to');
    }
    return { action: input.action, from, to };
  }
}

/** A malformed date (RangeError from the helper) is a 400, not a 500. */
function dayRange(date: string) {
  try {
    return businessDayRange(date);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
}
