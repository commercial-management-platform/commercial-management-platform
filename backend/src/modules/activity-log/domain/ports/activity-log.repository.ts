import type { PageRequest } from '../../../../shared/application/pagination.js';
import type { ActivityAction } from '../../../../shared/domain/activity-log/activity-action.js';
import type { ActivityLogRecord } from '../entities/activity-log-record.js';

export const ACTIVITY_LOG_REPOSITORY = Symbol('ACTIVITY_LOG_REPOSITORY');

export interface ActivityLogFilter {
  action?: ActivityAction;
  /** Half-open range: from <= created_at < to. Either end may be omitted. */
  from?: Date;
  to?: Date;
}

/**
 * Read side of the activity log. Entries are written through the shared
 * ActivityLogPort; there is no update or delete (CA-04).
 */
export interface ActivityLogRepository {
  /** Entries of a client, newest first. */
  findPageByClient(
    clientId: number,
    filter: ActivityLogFilter,
    page: PageRequest,
  ): Promise<{ items: ActivityLogRecord[]; total: number }>;
}
