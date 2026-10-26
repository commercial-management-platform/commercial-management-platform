import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { GetDashboardKpisUseCase } from './application/use-cases/get-dashboard-kpis.use-case.js';
import { ListVisitTrackingUseCase } from './application/use-cases/list-visit-tracking.use-case.js';
import {
  DASHBOARD_READ,
  type DashboardReadPort,
} from './domain/ports/dashboard-read.port.js';
import { TypeOrmDashboardReadAdapter } from './infrastructure/persistence/typeorm-dashboard-read.adapter.js';
import { DashboardController } from './presentation/controllers/dashboard.controller.js';

/**
 * Composition root of the commercial dashboard (HU-15). It creates no table:
 * it reads visits, quotes, sales orders and follow-ups through DASHBOARD_READ.
 */
@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [
    { provide: DASHBOARD_READ, useClass: TypeOrmDashboardReadAdapter },
    {
      provide: GetDashboardKpisUseCase,
      inject: [DASHBOARD_READ],
      useFactory: (reader: DashboardReadPort) => new GetDashboardKpisUseCase(reader),
    },
    {
      provide: ListVisitTrackingUseCase,
      inject: [DASHBOARD_READ],
      useFactory: (reader: DashboardReadPort) => new ListVisitTrackingUseCase(reader),
    },
  ],
})
export class DashboardModule {}
