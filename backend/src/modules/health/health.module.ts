import { Module } from '@nestjs/common';
import { CheckHealthUseCase } from './application/check-health.use-case.js';
import {
  DATABASE_HEALTH_PORT,
  type DatabaseHealthPort,
} from './domain/database-health.port.js';
import { TypeOrmDatabaseHealthAdapter } from './infrastructure/typeorm-database-health.adapter.js';
import { HealthController } from './presentation/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [
    { provide: DATABASE_HEALTH_PORT, useClass: TypeOrmDatabaseHealthAdapter },
    {
      provide: CheckHealthUseCase,
      inject: [DATABASE_HEALTH_PORT],
      useFactory: (databaseHealth: DatabaseHealthPort) =>
        new CheckHealthUseCase(databaseHealth),
    },
  ],
})
export class HealthModule {}
