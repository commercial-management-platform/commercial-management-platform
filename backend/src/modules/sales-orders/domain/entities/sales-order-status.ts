import { ValidationError } from '../../../../shared/domain/errors/index.js';

/**
 * Provisional lifecycle for HU-14. Keep the business-approved states and
 * transitions here so they can be changed without touching transport code.
 */
export const SALES_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'delivered',
  'cancelled',
] as const;

export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

export const SALES_ORDER_STATUS_RULES: Readonly<
  Record<
    SalesOrderStatus,
    { readonly allowedNext: readonly SalesOrderStatus[] }
  >
> = {
  pending: { allowedNext: ['confirmed', 'cancelled'] },
  confirmed: { allowedNext: ['delivered', 'cancelled'] },
  delivered: { allowedNext: [] },
  cancelled: { allowedNext: [] },
};

/** Dashboard consumers can use this definition until the workflow is approved. */
export function isSalesOrderClosed(status: SalesOrderStatus): boolean {
  return SALES_ORDER_STATUS_RULES[status].allowedNext.length === 0;
}

export function isSalesOrderStatus(value: string): value is SalesOrderStatus {
  return (SALES_ORDER_STATUSES as readonly string[]).includes(value);
}

export function assertSalesOrderTransition(
  current: SalesOrderStatus,
  next: SalesOrderStatus,
): void {
  if (!SALES_ORDER_STATUS_RULES[current].allowedNext.includes(next)) {
    throw new ValidationError(
      `Cannot change a sales order from '${current}' to '${next}'`,
    );
  }
}
