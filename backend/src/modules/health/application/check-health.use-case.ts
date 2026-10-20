import type { DatabaseHealthPort } from '../domain/database-health.port.js';
import type { HealthStatus } from '../domain/health-status.js';

/** Pure use case: wired in health.module.ts through a factory provider. */
export class CheckHealthUseCase {
  constructor(private readonly databaseHealth: DatabaseHealthPort) {}

  async execute(): Promise<HealthStatus> {
    const isUp = await this.databaseHealth.isUp();
    return isUp
      ? { status: 'ok', database: 'up' }
      : { status: 'error', database: 'down' };
  }
}
