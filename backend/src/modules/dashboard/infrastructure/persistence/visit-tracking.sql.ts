import { SqlConditions } from '../../../../shared/infrastructure/persistence/sql-conditions.js';
import type { VisitTrackingFilter } from '../../domain/ports/dashboard-read.port.js';

/**
 * SQL of the table "Seguimiento de rutas y visitas" (HU-15, CA-06). The
 * dashboard reads it a page at a time and the CSV report (HU-17) reads it
 * whole through a cursor, so both always have the same rows and columns.
 */

/** Tables the filters need. */
const BASE_FROM = `FROM visit v
         JOIN client c ON c.id = v.client_id
         JOIN advisor a ON a.id = v.advisor_id`;

const SELECT = `SELECT v.id AS "visitId",
              v.scheduled_date AS "scheduledDate",
              a.id AS "advisorId",
              a.name AS "advisorName",
              z.name AS "zone",
              r.id AS "routeId",
              r.name AS "routeName",
              c.id AS "clientId",
              COALESCE(NULLIF(c.trade_name, ''), c.business_name) AS "clientName",
              c.municipality AS "municipality",
              ct.name AS "clientType",
              cp.name AS "clientPotential",
              v.status AS "status",
              vr.name AS "result",
              qa.numbers AS "quoteNumbers",
              qa.value AS "quoteValue",
              oa.numbers AS "orderNumbers",
              to_char(fa.next_date, 'YYYY-MM-DD') AS "nextFollowUp"
         ${BASE_FROM}
         LEFT JOIN zone z ON z.id = c.zone_id
         LEFT JOIN route r ON r.id = v.route_id
         LEFT JOIN client_type ct ON ct.id = c.client_type_id
         LEFT JOIN client_potential cp ON cp.id = c.client_potential_id
         LEFT JOIN visit_outcome vo ON vo.visit_id = v.id
         LEFT JOIN visit_result vr ON vr.id = vo.visit_result_id
         -- Every quote linked to the visit: their numbers and their total value.
         LEFT JOIN LATERAL (
           SELECT string_agg(q.number, ' / ' ORDER BY q.id) AS numbers,
                  sum(q.value)::text AS value
             FROM quote q
            WHERE q.visit_id = v.id
         ) qa ON true
         -- Orders of the visit itself or created from one of its quotes.
         LEFT JOIN LATERAL (
           SELECT string_agg(o.number, ' / ' ORDER BY o.id) AS numbers
             FROM sales_order o
            WHERE o.visit_id = v.id
               OR o.quote_id IN (SELECT q.id FROM quote q WHERE q.visit_id = v.id)
         ) oa ON true
         LEFT JOIN LATERAL (
           SELECT min(f.next_date) AS next_date
             FROM follow_up f
            WHERE f.visit_id = v.id AND NOT f.completed
         ) fa ON true`;

const ORDER = 'ORDER BY v.scheduled_date DESC, v.id DESC';

export function visitTrackingConditions(
  filter: VisitTrackingFilter,
): SqlConditions {
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
  const search = filter.search?.trim();
  if (search) {
    // The route is optional: a subquery keeps BASE_FROM, used by the count, small.
    where.add(
      `concat_ws(' ', c.business_name, c.trade_name, c.municipality, a.name,
                 (SELECT r2.name FROM route r2 WHERE r2.id = v.route_id)) ILIKE ?`,
      // %, _ and \ are taken literally, not as LIKE wildcards.
      `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`,
    );
  }
  return where;
}

/** Every row of the filter, newest first. */
export function visitTrackingSql(where: SqlConditions): string {
  return `${SELECT}
         ${where.toSql()}
        ${ORDER}`;
}

/** One page of the filter: LIMIT and OFFSET go after the filter params. */
export function visitTrackingPageSql(where: SqlConditions): string {
  const limit = where.params.length + 1;
  return `${visitTrackingSql(where)}
        LIMIT $${limit} OFFSET $${limit + 1}`;
}

export function visitTrackingCountSql(where: SqlConditions): string {
  return `SELECT count(*)::int AS "total"
         ${BASE_FROM}
         ${where.toSql()}`;
}
