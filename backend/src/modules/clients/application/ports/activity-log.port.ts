/**
 * The activity log port moved to shared (HU-16) so any module can use it.
 * Re-exported here so the existing imports of clients, contacts and
 * portfolios keep working; new code imports it from shared.
 */
export {
  ACTIVITY_LOG,
  type ActivityLogEntry,
  type ActivityLogPort,
  type ActivityAction as ClientActivityAction,
} from '../../../../shared/application/ports/activity-log.port.js';
