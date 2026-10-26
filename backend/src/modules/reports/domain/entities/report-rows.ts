import type { QuoteStatus } from '../../../quotes/domain/entities/quote-status.js';
import type { SalesOrderStatus } from '../../../sales-orders/domain/entities/sales-order-status.js';

/**
 * Read models of the CSV reports (HU-17). Plain data: the reports only read,
 * they never change a visit, a quote or a sales order. Amounts are decimal
 * text, as PostgreSQL returns numeric, to keep their exact value.
 */

/** The CSV of the dashboard table reuses its read model (HU-15). */
export type { VisitTrackingRow } from '../../../dashboard/domain/entities/visit-tracking-row.js';

export interface QuoteReportRow {
  number: string;
  /** Calendar date of the quote, YYYY-MM-DD. */
  date: string;
  clientName: string;
  clientNit: string;
  advisorName: string;
  status: QuoteStatus;
  value: string;
  currency: string;
}

export interface SalesOrderReportRow {
  number: string;
  /** Calendar date of the order, YYYY-MM-DD. */
  date: string;
  clientName: string;
  clientNit: string;
  advisorName: string;
  quoteNumber: string | null;
  status: SalesOrderStatus;
  value: string;
  /** YYYY-MM-DD. */
  estimatedDeliveryDate: string;
}
