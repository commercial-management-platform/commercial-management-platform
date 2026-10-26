import type { QuoteStatus } from '../../../quotes/domain/entities/quote-status.js';
import type { SalesOrderStatus } from '../../../sales-orders/domain/entities/sales-order-status.js';
import type { VisitTrackingFilter } from '../../../dashboard/domain/ports/dashboard-read.port.js';
import type {
  QuoteReportRow,
  SalesOrderReportRow,
  VisitTrackingRow,
} from '../entities/report-rows.js';

export const REPORT_SOURCES = Symbol('REPORT_SOURCES');

/** Same filters as the dashboard tracking table (HU-15). */
export type { VisitTrackingFilter };

/** Same filters as GET /quotes and GET /sales-orders. */
export interface CommercialDocumentFilter<S> {
  clientId?: number;
  advisorId?: number;
  status?: S;
  /** Inclusive calendar dates, YYYY-MM-DD. */
  fromDate?: string;
  toDate?: string;
  /** Visible clients of an advisor; an empty list means no rows. */
  clientIds?: number[];
}

/**
 * Read side of the reports. Each method yields its rows little by little
 * (CA-07), ordered newest first, without loading the whole result.
 */
export interface ReportSourcesPort {
  visitTracking(filter: VisitTrackingFilter): AsyncIterable<VisitTrackingRow>;
  quotes(
    filter: CommercialDocumentFilter<QuoteStatus>,
  ): AsyncIterable<QuoteReportRow>;
  salesOrders(
    filter: CommercialDocumentFilter<SalesOrderStatus>,
  ): AsyncIterable<SalesOrderReportRow>;
}
