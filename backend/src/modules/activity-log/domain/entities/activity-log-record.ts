import type { ActivityAction } from '../../../../shared/domain/activity-log/activity-action.js';

export interface ActivityLogRecordProps {
  id: number;
  clientId: number;
  action: ActivityAction;
  /** betterAuth user that performed the action, taken from the session. */
  userId: string;
  /** Name of that user, for display; null if it cannot be resolved. */
  userName: string | null;
  description: string;
  createdAt: Date;
}

/**
 * One entry of the history of a client (HU-16). Immutable: it has no setters
 * and the repository has no update or delete.
 */
export class ActivityLogRecord {
  readonly id: number;
  readonly clientId: number;
  readonly action: ActivityAction;
  readonly userId: string;
  readonly userName: string | null;
  readonly description: string;
  readonly createdAt: Date;

  constructor(props: ActivityLogRecordProps) {
    this.id = props.id;
    this.clientId = props.clientId;
    this.action = props.action;
    this.userId = props.userId;
    this.userName = props.userName;
    this.description = props.description;
    this.createdAt = props.createdAt;
  }
}
