import { ValidationError } from '../../../../shared/domain/errors/index.js';

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

export const QUOTE_STATUS_RULES: Readonly<
  Record<
    QuoteStatus,
    {
      readonly allowedNext: readonly QuoteStatus[];
      readonly detailsEditable: boolean;
    }
  >
> = {
  draft: { allowedNext: ['sent'], detailsEditable: true },
  sent: { allowedNext: ['approved', 'rejected'], detailsEditable: true },
  approved: { allowedNext: [], detailsEditable: false },
  rejected: { allowedNext: [], detailsEditable: false },
};

export function isQuoteClosed(status: QuoteStatus): boolean {
  return !QUOTE_STATUS_RULES[status].detailsEditable;
}

export function assertQuoteDetailsEditable(status: QuoteStatus): void {
  if (isQuoteClosed(status)) {
    throw new ValidationError(
      `Quote details cannot be changed while quote status is '${status}'`,
    );
  }
}

export function isQuoteStatus(value: string): value is QuoteStatus {
  return (QUOTE_STATUSES as readonly string[]).includes(value);
}
