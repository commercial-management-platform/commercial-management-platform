/**
 * Quote lifecycle proposed for HU-12. Keep this list and its transitions in
 * one place until the business team confirms the final workflow.
 */
export const QUOTE_STATUSES = [
  'draft',
  'sent',
  'approved',
  'rejected',
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_TRANSITIONS: Readonly<
  Record<QuoteStatus, readonly QuoteStatus[]>
> = {
  draft: ['sent'],
  sent: ['approved', 'rejected'],
  approved: [],
  rejected: [],
};

export function isQuoteStatus(value: string): value is QuoteStatus {
  return (QUOTE_STATUSES as readonly string[]).includes(value);
}
