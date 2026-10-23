import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type {
  QuoteAdvisorReference,
  QuoteClientReference,
  QuoteVisitReference,
} from '../../../domain/ports/quote-references.port.js';

/** Cross-module persistence reads required by quote business rules. */
@Injectable()
export class QuoteReferencesDao {
  constructor(private readonly dataSource: DataSource) {}

  async findClient(clientId: number): Promise<QuoteClientReference | null> {
    const rows: QuoteClientReference[] = await this.dataSource.query(
      `SELECT "id", "active" FROM "client" WHERE "id" = $1 LIMIT 1`,
      [clientId],
    );
    return rows[0] ?? null;
  }

  async findAdvisor(advisorId: number): Promise<QuoteAdvisorReference | null> {
    const rows: { id: number; status: string }[] = await this.dataSource.query(
      `SELECT "id", "status" FROM "advisor" WHERE "id" = $1 LIMIT 1`,
      [advisorId],
    );
    return rows[0]
      ? { id: rows[0].id, active: rows[0].status === 'active' }
      : null;
  }

  async findAdvisorByUserId(
    userId: string,
  ): Promise<QuoteAdvisorReference | null> {
    const rows: { id: number; status: string }[] = await this.dataSource.query(
      `SELECT "id", "status" FROM "advisor" WHERE "user_id" = $1 LIMIT 1`,
      [userId],
    );
    return rows[0]
      ? { id: rows[0].id, active: rows[0].status === 'active' }
      : null;
  }

  async findVisit(visitId: number): Promise<QuoteVisitReference | null> {
    const rows: QuoteVisitReference[] = await this.dataSource.query(
      `SELECT "id", "client_id" AS "clientId", "advisor_id" AS "advisorId"
         FROM "visit" WHERE "id" = $1 LIMIT 1`,
      [visitId],
    );
    return rows[0] ?? null;
  }
}
