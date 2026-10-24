import type { SalesOrderStatus } from '../../../sales-orders/domain/entities/sales-order-status.js';

/**
 * Indicators of section 3 of HU-15 for one period. Amounts are decimal text,
 * as PostgreSQL returns numeric.
 */
export interface CommercialKpis {
  /** Visits of the period, not counting the cancelled ones. */
  scheduledVisits: number;
  /** Visits of the period in status visited. */
  completedVisits: number;
  /** Sum of the value of the quotes of the period. */
  quotedValue: string;
  /** Sales orders of the period in a closed status. */
  closedOrders: number;
  /** Sum of the value of those sales orders. */
  billedValue: string;
}

/**
 * Pending confirmation in HU-15: which status means a closed order. A sale is
 * taken as closed once it is confirmed, and it stays closed when delivered.
 */
export const CLOSED_SALES_ORDER_STATUSES: readonly SalesOrderStatus[] = [
  'confirmed',
  'delivered',
];

/** Completed ÷ scheduled visits, as a whole percentage; 0 with nothing scheduled. */
export function effectiveness(kpis: CommercialKpis): number {
  return kpis.scheduledVisits > 0
    ? Math.round((kpis.completedVisits / kpis.scheduledVisits) * 100)
    : 0;
}
