import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import {
  CATALOG_LOOKUP,
  type CatalogLookupPort,
} from '../catalogs/application/ports/catalog-lookup.port.js';
import { CatalogsModule } from '../catalogs/catalogs.module.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { CancelVisitUseCase } from './application/cancel-visit.use-case.js';
import { GenerateRouteVisitsUseCase } from './application/generate-route-visits.use-case.js';
import { GetVisitAgendaUseCase } from './application/get-visit-agenda.use-case.js';
import { GetVisitFormUseCase } from './application/get-visit-form.use-case.js';
import { GetVisitUseCase } from './application/get-visit.use-case.js';
import { ListVisitsUseCase } from './application/list-visits.use-case.js';
import {
  VISIT_REFERENCES,
  type VisitReferencesPort,
} from './application/ports/visit-references.port.js';
import { RecordVisitOutcomeUseCase } from './application/record-visit-outcome.use-case.js';
import { RescheduleVisitUseCase } from './application/reschedule-visit.use-case.js';
import { ScheduleVisitUseCase } from './application/schedule-visit.use-case.js';
import { StartVisitUseCase } from './application/start-visit.use-case.js';
import {
  VISIT_REPOSITORY,
  type VisitRepository,
} from './domain/visit.repository.js';
import { TypeOrmVisitReferencesAdapter } from './infrastructure/adapters/typeorm-visit-references.adapter.js';
import { VisitOutcomeOrmEntity } from './infrastructure/persistence/entities/visit-outcome.orm-entity.js';
import { VisitOrmEntity } from './infrastructure/persistence/entities/visit.orm-entity.js';
import { TypeOrmVisitRepository } from './infrastructure/repositories/visit.repository.impl.js';
import { RouteVisitsController } from './presentation/route-visits.controller.js';
import { VisitsController } from './presentation/visits.controller.js';

export const VISIT_CHECKIN_RADIUS_METERS = Symbol('VISIT_CHECKIN_RADIUS_METERS');

/**
 * Composition root of the visits module (HU-08, HU-09).
 *
 * VISIT_REFERENCES is owned here: it reads client, advisor, route,
 * route_client and contact with plain SQL, so visits does not depend on the
 * internals of clients, users, routes or contacts (same approach as
 * ADVISOR_LOOKUP in routes).
 *
 * CATALOG_LOOKUP (CatalogsModule) validates visit_objective, visit_type and
 * visit_result when an outcome is recorded.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([VisitOrmEntity, VisitOutcomeOrmEntity]),
    AuthModule,
    CatalogsModule,
  ],
  controllers: [VisitsController, RouteVisitsController],
  providers: [
    { provide: VISIT_REPOSITORY, useClass: TypeOrmVisitRepository },
    { provide: VISIT_REFERENCES, useClass: TypeOrmVisitReferencesAdapter },
    {
      provide: VISIT_CHECKIN_RADIUS_METERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        config.get('VISIT_CHECKIN_RADIUS_METERS', { infer: true }),
    },
    {
      provide: ScheduleVisitUseCase,
      inject: [VISIT_REPOSITORY, VISIT_REFERENCES],
      useFactory: (repo: VisitRepository, references: VisitReferencesPort) =>
        new ScheduleVisitUseCase(repo, references),
    },
    {
      provide: GenerateRouteVisitsUseCase,
      inject: [VISIT_REPOSITORY, VISIT_REFERENCES],
      useFactory: (repo: VisitRepository, references: VisitReferencesPort) =>
        new GenerateRouteVisitsUseCase(repo, references),
    },
    {
      provide: ListVisitsUseCase,
      inject: [VISIT_REPOSITORY],
      useFactory: (repo: VisitRepository) => new ListVisitsUseCase(repo),
    },
    {
      provide: GetVisitAgendaUseCase,
      inject: [VISIT_REPOSITORY],
      useFactory: (repo: VisitRepository) => new GetVisitAgendaUseCase(repo),
    },
    {
      provide: GetVisitUseCase,
      inject: [VISIT_REPOSITORY],
      useFactory: (repo: VisitRepository) => new GetVisitUseCase(repo),
    },
    {
      provide: RescheduleVisitUseCase,
      inject: [VISIT_REPOSITORY],
      useFactory: (repo: VisitRepository) => new RescheduleVisitUseCase(repo),
    },
    {
      provide: CancelVisitUseCase,
      inject: [VISIT_REPOSITORY],
      useFactory: (repo: VisitRepository) => new CancelVisitUseCase(repo),
    },
    {
      provide: GetVisitFormUseCase,
      inject: [VISIT_REPOSITORY, VISIT_REFERENCES],
      useFactory: (repo: VisitRepository, references: VisitReferencesPort) =>
        new GetVisitFormUseCase(repo, references),
    },
    {
      provide: StartVisitUseCase,
      inject: [VISIT_REPOSITORY, VISIT_REFERENCES, VISIT_CHECKIN_RADIUS_METERS],
      useFactory: (
        repo: VisitRepository,
        references: VisitReferencesPort,
        checkInRadiusMeters: number,
      ) => new StartVisitUseCase(repo, references, checkInRadiusMeters),
    },
    {
      provide: RecordVisitOutcomeUseCase,
      inject: [VISIT_REPOSITORY, CATALOG_LOOKUP],
      useFactory: (repo: VisitRepository, catalogs: CatalogLookupPort) =>
        new RecordVisitOutcomeUseCase(repo, catalogs),
    },
  ],
})
export class VisitsModule {}
