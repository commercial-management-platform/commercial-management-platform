import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  SalesOrderAdvisorReference,
  SalesOrderClientReference,
  SalesOrderQuoteReference,
  SalesOrderVisitReference,
} from '../../../domain/ports/sales-order-references.port.js';

@Injectable()
export class SalesOrderReferencesDao {
  constructor(private readonly dataSource: DataSource) {}
  async findClient(
    clientId: number,
  ): Promise<SalesOrderClientReference | null> {
    const rows: SalesOrderClientReference[] = await this.dataSource.query(
      `SELECT "id", "active" FROM "client" WHERE "id" = $1 LIMIT 1`,
      [clientId],
    );
    return rows[0] ?? null;
  }
  async findAdvisor(
    advisorId: number,
  ): Promise<SalesOrderAdvisorReference | null> {
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
  ): Promise<SalesOrderAdvisorReference | null> {
    const rows: { id: number; status: string }[] = await this.dataSource.query(
      `SELECT "id", "status" FROM "advisor" WHERE "user_id" = $1 LIMIT 1`,
      [userId],
    );
    return rows[0]
      ? { id: rows[0].id, active: rows[0].status === 'active' }
      : null;
  }
  async findVisit(visitId: number): Promise<SalesOrderVisitReference | null> {
    const rows: SalesOrderVisitReference[] = await this.dataSource.query(
      `SELECT "id", "client_id" AS "clientId", "advisor_id" AS "advisorId" FROM "visit" WHERE "id" = $1 LIMIT 1`,
      [visitId],
    );
    return rows[0] ?? null;
  }
  async findQuote(quoteId: number): Promise<SalesOrderQuoteReference | null> {
    const rows: SalesOrderQuoteReference[] = await this.dataSource.query(
      `SELECT "id", "client_id" AS "clientId", "advisor_id" AS "advisorId", "visit_id" AS "visitId", "value" FROM "quote" WHERE "id" = $1 LIMIT 1`,
      [quoteId],
    );
    return rows[0] ?? null;
  }
}
