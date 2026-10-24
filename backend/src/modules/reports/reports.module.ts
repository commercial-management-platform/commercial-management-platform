import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../clients/application/ports/advisor-client-access.port.js';
import { ClientsModule } from '../clients/clients.module.js';
import {
  ExportQuotesUseCase,
  ExportSalesOrdersUseCase,
} from './application/use-cases/export-commercial-documents.use-case.js';
import { ExportVisitTrackingUseCase } from './application/use-cases/export-visit-tracking.use-case.js';
import {
  REPORT_SOURCES,
  type ReportSourcesPort,
} from './domain/ports/report-sources.port.js';
import { TypeOrmReportSourcesAdapter } from './infrastructure/persistence/typeorm-report-sources.adapter.js';
import { ReportsController } from './presentation/controllers/reports.controller.js';

/**
 * Composition root of the CSV reports (HU-17). It creates no table: it reads
 * those of visits, quotes and sales orders through REPORT_SOURCES. The
 * advisor visibility of quotes and sales orders comes from ClientsModule
 * (ADVISOR_CLIENT_ACCESS), the same port GET /quotes and GET /sales-orders use.
 */
@Module({
  imports: [AuthModule, ClientsModule],
  controllers: [ReportsController],
  providers: [
    { provide: REPORT_SOURCES, useClass: TypeOrmReportSourcesAdapter },
    {
      provide: ExportVisitTrackingUseCase,
      inject: [REPORT_SOURCES],
      useFactory: (sources: ReportSourcesPort) =>
        new ExportVisitTrackingUseCase(sources),
    },
    {
      provide: ExportQuotesUseCase,
      inject: [REPORT_SOURCES, ADVISOR_CLIENT_ACCESS],
      useFactory: (
        sources: ReportSourcesPort,
        advisorAccess: AdvisorClientAccessPort,
      ) => new ExportQuotesUseCase(sources, advisorAccess),
    },
    {
      provide: ExportSalesOrdersUseCase,
      inject: [REPORT_SOURCES, ADVISOR_CLIENT_ACCESS],
      useFactory: (
        sources: ReportSourcesPort,
        advisorAccess: AdvisorClientAccessPort,
      ) => new ExportSalesOrdersUseCase(sources, advisorAccess),
    },
  ],
})
export class ReportsModule {}
