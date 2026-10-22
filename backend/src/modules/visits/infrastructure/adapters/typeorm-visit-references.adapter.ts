import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type {
  AdvisorReference,
  ClientReference,
  RouteClientReference,
  RouteReference,
  VisitReferencesPort,
} from '../../application/ports/visit-references.port.js';

/**
 * Reads the client, advisor, route and route_client tables with plain SQL,
 * so visits does not depend on the internals of clients, users or routes
 * (same approach as TypeOrmAdvisorLookupAdapter in the routes module).
 */
@Injectable()
export class TypeOrmVisitReferencesAdapter implements VisitReferencesPort {
  constructor(private readonly dataSource: DataSource) {}

  async findClient(clientId: number): Promise<ClientReference | null> {
    const rows: { id: number; active: boolean }[] = await this.dataSource.query(
      `SELECT "id", "active" FROM "client" WHERE "id" = $1 LIMIT 1`,
      [clientId],
    );
    return rows[0] ?? null;
  }

  async findAdvisor(advisorId: number): Promise<AdvisorReference | null> {
    const rows: { id: number; status: string }[] = await this.dataSource.query(
      `SELECT "id", "status" FROM "advisor" WHERE "id" = $1 LIMIT 1`,
      [advisorId],
    );
    if (!rows[0]) return null;
    return { id: rows[0].id, active: rows[0].status === 'active' };
  }

  async findRoute(routeId: number): Promise<RouteReference | null> {
    const rows: {
      id: number;
      advisor_id: number;
      status: string;
      suggested_start_time: string | null;
    }[] = await this.dataSource.query(
      `SELECT "id", "advisor_id", "status", "suggested_start_time"
         FROM "route" WHERE "id" = $1 LIMIT 1`,
      [routeId],
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      advisorId: rows[0].advisor_id,
      active: rows[0].status === 'active',
      suggestedStartTime: rows[0].suggested_start_time,
    };
  }

  async isClientOnRoute(routeId: number, clientId: number): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM "route_client"
         WHERE "route_id" = $1 AND "client_id" = $2 LIMIT 1`,
      [routeId, clientId],
    );
    return rows.length > 0;
  }

  async findRouteClients(routeId: number): Promise<RouteClientReference[]> {
    const rows: {
      client_id: number;
      visit_order: number;
      active: boolean;
    }[] = await this.dataSource.query(
      `SELECT rc."client_id" AS client_id, rc."visit_order" AS visit_order, c."active" AS active
         FROM "route_client" rc
         JOIN "client" c ON c."id" = rc."client_id"
        WHERE rc."route_id" = $1
        ORDER BY rc."visit_order" ASC`,
      [routeId],
    );
    return rows.map((row) => ({
      clientId: row.client_id,
      visitOrder: row.visit_order,
      clientActive: row.active,
    }));
  }
}
