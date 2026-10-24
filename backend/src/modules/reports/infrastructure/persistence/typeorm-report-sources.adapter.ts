import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { queryWithCursor } from '../../../../shared/infrastructure/persistence/cursor-query.js';
import type { QuoteStatus } from '../../../quotes/domain/entities/quote-status.js';
import type { SalesOrderStatus } from '../../../sales-orders/domain/entities/sales-order-status.js';
import type {
  QuoteReportRow,
  SalesOrderReportRow,
  VisitTrackingRow,
} from '../../domain/entities/report-rows.js';
import type {
  CommercialDocumentFilter,
  ReportSourcesPort,
  VisitTrackingFilter,
} from '../../domain/ports/report-sources.port.js';

/** Collects WHERE conditions with numbered placeholders ($1, $2...). */
class SqlConditions {
  readonly params: unknown[] = [];
  private readonly conditions: string[] = [];

  /** `sql` uses `?` where the value goes, e.g. 'v.status = ?'. */
  add(sql: string, value: unknown): void {
    this.params.push(value);
    this.conditions.push(sql.replace('?', `$${this.params.length}`));
  }

  toSql(): string {
    return this.conditions.length > 0
      ? `WHERE ${this.conditions.join(' AND ')}`
      : '';
  }
}

/** Yields nothing, without opening a connection. */
async function* noRows<T>(): AsyncGenerator<T> {}

/**
 * Report queries (HU-17). Read-only SQL over the tables of visits (HU-08/09),
 * quotes (HU-12) and sales orders (HU-14), read through a PostgreSQL cursor
 * so the CSV is produced in parts (CA-07).
 */
@Injectable()
export class TypeOrmReportSourcesAdapter implements ReportSourcesPort {
  constructor(private readonly dataSource: DataSource) {}

  visitTracking(filter: VisitTrackingFilter): AsyncIterable<VisitTrackingRow> {
    const where = new SqlConditions();
    if (filter.from) where.add('v.scheduled_date >= ?', filter.from);
    if (filter.to) where.add('v.scheduled_date < ?', filter.to);
    if (filter.zoneId !== undefined) where.add('c.zone_id = ?', filter.zoneId);
    if (filter.advisorId !== undefined) {
      where.add('v.advisor_id = ?', filter.advisorId);
    }
    if (filter.advisorUserId !== undefined) {
      where.add('a.user_id = ?', filter.advisorUserId);
    }
    if (filter.status !== undefined) where.add('v.status = ?', filter.status);

    // "Cotización" adds up every quote linked to the visit (quote.visit_id).
    return queryWithCursor<VisitTrackingRow>(
      this.dataSource,
      `SELECT v.id AS "visitId",
              v.scheduled_date AS "scheduledDate",
              c.business_name AS "clientName",
              c.municipality AS "municipality",
              ct.name AS "clientType",
              cp.name AS "clientPotential",
              v.status AS "status",
              (SELECT sum(q.value)::text FROM quote q WHERE q.visit_id = v.id) AS "quoteValue",
              vr.name AS "result"
         FROM visit v
         JOIN client c ON c.id = v.client_id
         JOIN advisor a ON a.id = v.advisor_id
         LEFT JOIN client_type ct ON ct.id = c.client_type_id
         LEFT JOIN client_potential cp ON cp.id = c.client_potential_id
         LEFT JOIN visit_outcome vo ON vo.visit_id = v.id
         LEFT JOIN visit_result vr ON vr.id = vo.visit_result_id
         ${where.toSql()}
        ORDER BY v.scheduled_date DESC, v.id DESC`,
      where.params,
    );
  }

  quotes(
    filter: CommercialDocumentFilter<QuoteStatus>,
  ): AsyncIterable<QuoteReportRow> {
    const where = this.documentConditions('q', filter);
    if (!where) return noRows();

    return queryWithCursor<QuoteReportRow>(
      this.dataSource,
      `SELECT q.number AS "number",
              to_char(q.date, 'YYYY-MM-DD') AS "date",
              c.business_name AS "clientName",
              c.nit AS "clientNit",
              a.name AS "advisorName",
              q.status AS "status",
              q.value::text AS "value",
              q.currency AS "currency"
         FROM quote q
         JOIN client c ON c.id = q.client_id
         JOIN advisor a ON a.id = q.advisor_id
         ${where.toSql()}
        ORDER BY q.date DESC, q.id DESC`,
      where.params,
    );
  }

  salesOrders(
    filter: CommercialDocumentFilter<SalesOrderStatus>,
  ): AsyncIterable<SalesOrderReportRow> {
    const where = this.documentConditions('o', filter);
    if (!where) return noRows();

    return queryWithCursor<SalesOrderReportRow>(
      this.dataSource,
      `SELECT o.number AS "number",
              to_char(o.date, 'YYYY-MM-DD') AS "date",
              c.business_name AS "clientName",
              c.nit AS "clientNit",
              a.name AS "advisorName",
              q.number AS "quoteNumber",
              o.status AS "status",
              o.value::text AS "value",
              to_char(o.estimated_delivery_date, 'YYYY-MM-DD') AS "estimatedDeliveryDate"
         FROM sales_order o
         JOIN client c ON c.id = o.client_id
         JOIN advisor a ON a.id = o.advisor_id
         LEFT JOIN quote q ON q.id = o.quote_id
         ${where.toSql()}
        ORDER BY o.date DESC, o.id DESC`,
      where.params,
    );
  }

  /**
   * Filters of GET /quotes and GET /sales-orders on table `alias`. Null when
   * the advisor has no visible client: nothing to query.
   */
  private documentConditions<S>(
    alias: 'q' | 'o',
    filter: CommercialDocumentFilter<S>,
  ): SqlConditions | null {
    if (filter.clientIds !== undefined && filter.clientIds.length === 0) {
      return null;
    }
    const where = new SqlConditions();
    if (filter.clientIds !== undefined) {
      where.add(`${alias}.client_id = ANY(?::int[])`, filter.clientIds);
    }
    if (filter.clientId !== undefined) {
      where.add(`${alias}.client_id = ?`, filter.clientId);
    }
    if (filter.advisorId !== undefined) {
      where.add(`${alias}.advisor_id = ?`, filter.advisorId);
    }
    if (filter.status !== undefined) {
      where.add(`${alias}.status = ?`, filter.status);
    }
    if (filter.fromDate !== undefined) {
      where.add(`${alias}.date >= ?::date`, filter.fromDate);
    }
    if (filter.toDate !== undefined) {
      where.add(`${alias}.date <= ?::date`, filter.toDate);
    }
    return where;
  }
}
