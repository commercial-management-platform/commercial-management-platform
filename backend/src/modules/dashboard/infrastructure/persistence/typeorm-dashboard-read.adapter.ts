import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import {
  pageOffset,
  type PageRequest,
  type Paginated,
} from '../../../../shared/application/pagination.js';
import { SqlConditions } from '../../../../shared/infrastructure/persistence/sql-conditions.js';
import { VisitStatus } from '../../../visits/domain/visit-status.js';
import {
  CLOSED_SALES_ORDER_STATUSES,
  type CommercialKpis,
} from '../../domain/entities/commercial-kpis.js';
import type { VisitTrackingRow } from '../../domain/entities/visit-tracking-row.js';
import type {
  DashboardReadPort,
  KpiFilter,
  VisitTrackingFilter,
} from '../../domain/ports/dashboard-read.port.js';
import {
  visitTrackingConditions,
  visitTrackingCountSql,
  visitTrackingPageSql,
} from './visit-tracking.sql.js';

/** Zone and advisor filters of a table aliased `alias` (visit, quote or order). */
function scoped(
  alias: 'v' | 'q' | 'o',
  filter: KpiFilter,
  where = new SqlConditions(),
): SqlConditions {
  if (filter.zoneId !== undefined) where.add('c.zone_id = ?', filter.zoneId);
  if (filter.advisorId !== undefined) {
    where.add(`${alias}.advisor_id = ?`, filter.advisorId);
  }
  if (filter.advisorUserId !== undefined) {
    where.add('a.user_id = ?', filter.advisorUserId);
  }
  return where;
}

/** Joins every indicator needs to filter by zone (client) and by user (advisor). */
const joins = (alias: string) => `JOIN client c ON c.id = ${alias}.client_id
         JOIN advisor a ON a.id = ${alias}.advisor_id`;

/**
 * Read-only SQL of the dashboard (HU-15) over visits (HU-08/09), quotes
 * (HU-12), sales orders (HU-14) and follow-ups (HU-10).
 */
@Injectable()
export class TypeOrmDashboardReadAdapter implements DashboardReadPort {
  constructor(private readonly dataSource: DataSource) {}

  async kpis(filter: KpiFilter): Promise<CommercialKpis> {
    const visits = new SqlConditions();
    visits.add('v.scheduled_date >= ?', filter.from);
    visits.add('v.scheduled_date < ?', filter.to);
    scoped('v', filter, visits);
    const visitedParam = visits.params.push(VisitStatus.Visited);
    const cancelledParam = visits.params.push(VisitStatus.Cancelled);

    const quotes = new SqlConditions();
    quotes.add('q.date >= ?::date', filter.fromDate);
    quotes.add('q.date <= ?::date', filter.toDate);
    scoped('q', filter, quotes);

    const orders = new SqlConditions();
    orders.add('o.date >= ?::date', filter.fromDate);
    orders.add('o.date <= ?::date', filter.toDate);
    orders.add('o.status = ANY(?::text[])', CLOSED_SALES_ORDER_STATUSES);
    scoped('o', filter, orders);

    const [[visitCounts], [quoteSum], [orderSum]] = await Promise.all([
      this.dataSource.query<{ scheduledVisits: number; completedVisits: number }[]>(
        `SELECT count(*) FILTER (WHERE v.status <> $${cancelledParam})::int AS "scheduledVisits",
                count(*) FILTER (WHERE v.status = $${visitedParam})::int AS "completedVisits"
           FROM visit v
           ${joins('v')}
           ${visits.toSql()}`,
        visits.params,
      ),
      this.dataSource.query<{ quotedValue: string }[]>(
        `SELECT COALESCE(sum(q.value), 0)::text AS "quotedValue"
           FROM quote q
           ${joins('q')}
           ${quotes.toSql()}`,
        quotes.params,
      ),
      this.dataSource.query<{ closedOrders: number; billedValue: string }[]>(
        `SELECT count(*)::int AS "closedOrders",
                COALESCE(sum(o.value), 0)::text AS "billedValue"
           FROM sales_order o
           ${joins('o')}
           ${orders.toSql()}`,
        orders.params,
      ),
    ]);

    return { ...visitCounts, ...quoteSum, ...orderSum };
  }

  async trackingPage(
    filter: VisitTrackingFilter,
    page: PageRequest,
  ): Promise<Paginated<VisitTrackingRow>> {
    const where = visitTrackingConditions(filter);
    const [data, [{ total }]] = await Promise.all([
      this.dataSource.query<VisitTrackingRow[]>(visitTrackingPageSql(where), [
        ...where.params,
        page.limit,
        pageOffset(page),
      ]),
      this.dataSource.query<{ total: number }[]>(
        visitTrackingCountSql(where),
        where.params,
      ),
    ]);
    return { data, total, page: page.page, limit: page.limit };
  }
}
