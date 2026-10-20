import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { DatabaseHealthPort } from '../domain/database-health.port.js';

const QUERY_TIMEOUT_MS = 3000;

@Injectable()
export class TypeOrmDatabaseHealthAdapter implements DatabaseHealthPort {
  constructor(private readonly dataSource: DataSource) {}

  async isUp(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Database health check timed out')),
        QUERY_TIMEOUT_MS,
      );
    });

    try {
      await Promise.race([this.dataSource.query('SELECT 1'), timeout]);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
