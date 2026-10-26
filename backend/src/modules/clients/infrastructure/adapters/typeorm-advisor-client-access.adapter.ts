import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { AdvisorClientAccessPort } from '../../application/ports/advisor-client-access.port.js';

interface SchemaCheckRow {
  ok: boolean;
}

interface AccessibleClientRow {
  client_id: number | string;
}

/**
 * Resolves advisor visibility through route_client/route/advisor.
 *
 * Until the routes (HU-07) and advisors modules are merged, those tables do
 * not exist and every advisor is denied access. This is intentional: it is
 * safer to show nothing than to expose the whole client catalog.
 *
 * Assumption from docs/naming-glossary.md: advisor.user_id links to the
 * betterAuth user id, and route.advisor_id references advisor.id.
 */
@Injectable()
export class TypeOrmAdvisorClientAccessAdapter implements AdvisorClientAccessPort {
  constructor(private readonly dataSource: DataSource) {}

  async canAccess(userId: string, clientId: number): Promise<boolean> {
    if (!(await this.hasAdvisorSchema())) {
      return false;
    }

    const rows: unknown[] = await this.dataSource.query(
      `SELECT 1
         FROM route_client rc
         JOIN route r ON r.id = rc.route_id
         JOIN advisor a ON a.id = r.advisor_id
        WHERE a.user_id = $1 AND rc.client_id = $2
        LIMIT 1`,
      [userId, clientId],
    );

    return rows.length > 0;
  }

  async getAccessibleClientIds(userId: string): Promise<number[]> {
    if (!(await this.hasAdvisorSchema())) {
      return [];
    }

    const rows: AccessibleClientRow[] = await this.dataSource.query(
      `SELECT DISTINCT rc.client_id
         FROM route_client rc
         JOIN route r ON r.id = rc.route_id
         JOIN advisor a ON a.id = r.advisor_id
        WHERE a.user_id = $1`,
      [userId],
    );

    return rows.map((row) => Number(row.client_id));
  }

  private async hasAdvisorSchema(): Promise<boolean> {
    const rows: SchemaCheckRow[] = await this.dataSource.query(
      `SELECT to_regclass('public.route_client') IS NOT NULL
          AND to_regclass('public.route') IS NOT NULL
          AND to_regclass('public.advisor') IS NOT NULL AS ok`,
    );

    return rows[0]?.ok === true;
  }
}
