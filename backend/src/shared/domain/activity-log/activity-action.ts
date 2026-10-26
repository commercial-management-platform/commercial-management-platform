/**
 * Fixed list of actions of the activity log (HU-16). Each user story appends
 * its own here; the values are stored as they are in activity_log.action, so
 * never rename one.
 */
export const ACTIVITY_ACTIONS = [
  // Clients (HU-03).
  'client.created',
  'client.updated',
  'client.status_changed',
  // Bulk import of clients from CSV (HU-22).
  'client.imported',
  // Contacts of a client (HU-04).
  'contact.created',
  'contact.updated',
  'contact.status_changed',
  'contact.primary_changed',
  // Portfolios of a client (HU-06).
  'client.portfolio_added',
  'client.portfolio_removed',
  // Follow-ups of a client/visit (HU-10).
  'follow_up.created',
  'follow_up.completed',
  // Quotes (HU-12).
  'quote.created',
  'quote.status_changed',
  // Sales orders (HU-14).
  'sales_order.created',
  'sales_order.status_changed',
  // Visits (HU-08 and HU-09).
  'visit.scheduled',
  'visit.rescheduled',
  'visit.cancelled',
  'visit.completed',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export function isActivityAction(value: string): value is ActivityAction {
  return (ACTIVITY_ACTIONS as readonly string[]).includes(value);
}
