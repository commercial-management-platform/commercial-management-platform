import type { ActivityAction } from '../../domain/activity-log/activity-action.js';

export {
  ACTIVITY_ACTIONS,
  isActivityAction,
  type ActivityAction,
} from '../../domain/activity-log/activity-action.js';

/**
 * Shared port of the activity log (HU-16). Any module records what happens on
 * a client through it, without depending on the activity-log module: inject
 * ACTIVITY_LOG and call record() after the change is saved. To add an action,
 * append it to ACTIVITY_ACTIONS.
 *
 * The user id must come from the session (AuthGuard), never from the body.
 */
export const ACTIVITY_LOG = Symbol('ACTIVITY_LOG');

export interface ActivityLogEntry {
  action: ActivityAction;
  userId: string;
  clientId: number;
  description: string;
  occurredAt: Date;
}

/** Write-only on purpose: entries are never edited or deleted. */
export interface ActivityLogPort {
  record(entry: ActivityLogEntry): Promise<void>;
}
