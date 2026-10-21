import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { AdvisorLookupPort } from '../../application/ports/advisor-lookup.port.js';

/**
 * Reads the advisor table created by HU-02 (users module) with plain SQL, so
 * routes does not depend on the users module internals.
 */
@Injectable()
export class TypeOrmAdvisorLookupAdapter implements AdvisorLookupPort {
  constructor(private readonly dataSource: DataSource) {}

  async isActive(advisorId: number): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM advisor WHERE id = $1 AND status = 'active' LIMIT 1`,
      [advisorId],
    );
    return rows.length > 0;
  }
}
