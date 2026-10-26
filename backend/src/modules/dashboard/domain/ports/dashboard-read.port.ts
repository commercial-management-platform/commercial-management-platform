import type {
  PageRequest,
  Paginated,
} from '../../../../shared/application/pagination.js';
import type { VisitStatus } from '../../../visits/domain/visit-status.js';
import type { CommercialKpis } from '../entities/commercial-kpis.js';
import type { VisitTrackingRow } from '../entities/visit-tracking-row.js';

export const DASHBOARD_READ = Symbol('DASHBOARD_READ');

/** Who the indicators belong to: an advisor only sees their own (CA-03). */
interface AdvisorScope {
  zoneId?: number;
  advisorId?: number;
  /** Only the data of the advisor linked to this betterAuth user. */
  advisorUserId?: string;
}

export interface VisitTrackingFilter extends AdvisorScope {
  /** Half-open range on the scheduled date: from <= date < to. */
  from?: Date;
  to?: Date;
  status?: VisitStatus;
  /** Text in the client, municipality, advisor or route (case and accents as typed). */
  search?: string;
}

export interface KpiFilter extends AdvisorScope {
  /** Visits: half-open range of instants. */
  from: Date;
  to: Date;
  /** Quotes and sales orders: inclusive calendar dates, YYYY-MM-DD. */
  fromDate: string;
  toDate: string;
}

/**
 * Read side of the dashboard. It owns no table: it reads visits, quotes,
 * sales orders and follow-ups.
 */
export interface DashboardReadPort {
  kpis(filter: KpiFilter): Promise<CommercialKpis>;
  trackingPage(
    filter: VisitTrackingFilter,
    page: PageRequest,
  ): Promise<Paginated<VisitTrackingRow>>;
}
