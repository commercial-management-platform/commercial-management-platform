import type { QuoteStatus } from '../../../quotes/domain/entities/quote-status.js';
import type { SalesOrderStatus } from '../../../sales-orders/domain/entities/sales-order-status.js';
import type { VisitStatus } from '../../../visits/domain/visit-status.js';

/**
 * Read models of the CSV reports (HU-17). Plain data: the reports only read,
 * they never change a visit, a quote or a sales order. Amounts are decimal
 * text, as PostgreSQL returns numeric, to keep their exact value.
 */

/** One row of "Seguimiento de rutas y visitas" (dashboard table, HU-15). */
export interface VisitTrackingRow {
  visitId: number;
  scheduledDate: Date;
  clientName: string;
  municipality: string | null;
  clientType: string | null;
  clientPotential: string | null;
  status: VisitStatus;
  /** Sum of the quotes linked to the visit; null if it has none. */
  quoteValue: string | null;
  /** Visit result catalog name (HU-09); null until the outcome is recorded. */
  result: string | null;
}

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
