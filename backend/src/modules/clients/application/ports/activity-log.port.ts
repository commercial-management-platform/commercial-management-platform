export const ACTIVITY_LOG = Symbol('ACTIVITY_LOG');

export type ClientActivityAction =
  | 'client.created'
  | 'client.updated'
  | 'client.status_changed';

export interface ActivityLogEntry {
  action: ClientActivityAction;
  userId: string;
  clientId: number;
  description: string;
  occurredAt: Date;
}

export interface ActivityLogPort {
  record(entry: ActivityLogEntry): Promise<void>;
}
