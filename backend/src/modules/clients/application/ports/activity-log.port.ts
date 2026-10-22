export const ACTIVITY_LOG = Symbol('ACTIVITY_LOG');

export type ClientActivityAction =
  | 'client.created'
  | 'client.updated'
  | 'client.status_changed'
  // Contacts of a client (HU-04).
  | 'contact.created'
  | 'contact.updated'
  | 'contact.status_changed'
  | 'contact.primary_changed';

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
