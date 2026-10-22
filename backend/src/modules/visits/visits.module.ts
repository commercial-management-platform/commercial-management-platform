import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { CancelVisitUseCase } from './application/cancel-visit.use-case.js';
import { GenerateRouteVisitsUseCase } from './application/generate-route-visits.use-case.js';
import { GetVisitAgendaUseCase } from './application/get-visit-agenda.use-case.js';
import { GetVisitUseCase } from './application/get-visit.use-case.js';
import { ListVisitsUseCase } from './application/list-visits.use-case.js';
import {
  VISIT_REFERENCES,
  type VisitReferencesPort,
} from './application/ports/visit-references.port.js';
import { RescheduleVisitUseCase } from './application/reschedule-visit.use-case.js';
import { ScheduleVisitUseCase } from './application/schedule-visit.use-case.js';
import {
  VISIT_REPOSITORY,
  type VisitRepository,
} from './domain/visit.repository.js';
import { TypeOrmVisitReferencesAdapter } from './infrastructure/adapters/typeorm-visit-references.adapter.js';
import { VisitOrmEntity } from './infrastructure/persistence/entities/visit.orm-entity.js';
import { TypeOrmVisitRepository } from './infrastructure/repositories/visit.repository.impl.js';
import { RouteVisitsController } from './presentation/route-visits.controller.js';
import { VisitsController } from './presentation/visits.controller.js';

/**
 * Composition root of the visits module (HU-08).
 *
 * VISIT_REFERENCES is owned here: it reads client, advisor, route and
 * route_client with plain SQL, so visits does not depend on the internals
 * of clients, users or routes (same approach as ADVISOR_LOOKUP in routes).
 */
@Module({
  imports: [TypeOrmModule.forFeature([VisitOrmEntity]), AuthModule],
  controllers: [VisitsController, RouteVisitsController],
  providers: [
    { provide: VISIT_REPOSITORY, useClass: TypeOrmVisitRepository },
    { provide: VISIT_REFERENCES, useClass: TypeOrmVisitReferencesAdapter },
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
  ],
})
export class VisitsModule {}
