import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from './application/ports/advisor-client-access.port.js';
import {
  ACTIVITY_LOG,
  type ActivityLogPort,
} from './application/ports/activity-log.port.js';
import {
  CATALOG_VALIDATOR,
  type CatalogValidatorPort,
} from './application/ports/catalog-validator.port.js';
import { ChangeClientStatusUseCase } from './application/use-cases/change-client-status.use-case.js';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case.js';
import { GetClientByIdUseCase } from './application/use-cases/get-client-by-id.use-case.js';
import { ListClientsUseCase } from './application/use-cases/list-clients.use-case.js';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from './domain/repositories/client.repository.js';
import { DeferredCatalogValidatorAdapter } from './infrastructure/adapters/deferred-catalog-validator.adapter.js';
import { PendingActivityLogAdapter } from './infrastructure/adapters/pending-activity-log.adapter.js';
import { TypeOrmAdvisorClientAccessAdapter } from './infrastructure/adapters/typeorm-advisor-client-access.adapter.js';
import { ClientOrmEntity } from './infrastructure/persistence/entities/client.orm-entity.js';
import { TypeOrmClientRepository } from './infrastructure/repositories/typeorm-client.repository.js';
import { ClientsController } from './presentation/clients.controller.js';

/**
 * Composition root of the clients module (HU-03). It is the only file that
 * knows every layer: each port is wired to its infrastructure adapter.
 *
 * Deferred adapters until other stories are merged:
 * - CATALOG_VALIDATOR → HU-05 (catalogs), shape check only for now.
 * - ADVISOR_CLIENT_ACCESS → HU-07 (advisors/routes), denies every advisor
 *   until those tables exist.
 * - ACTIVITY_LOG → HU-16 (activity log), no-op for now.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ClientOrmEntity]), AuthModule],
  controllers: [ClientsController],
  providers: [
    { provide: CLIENT_REPOSITORY, useClass: TypeOrmClientRepository },
    { provide: CATALOG_VALIDATOR, useClass: DeferredCatalogValidatorAdapter },
    {
      provide: ADVISOR_CLIENT_ACCESS,
      useClass: TypeOrmAdvisorClientAccessAdapter,
    },
    { provide: ACTIVITY_LOG, useClass: PendingActivityLogAdapter },
    {
      provide: CreateClientUseCase,
      inject: [CLIENT_REPOSITORY, CATALOG_VALIDATOR, ACTIVITY_LOG],
      useFactory: (
        clients: ClientRepository,
        catalogs: CatalogValidatorPort,
        activityLog: ActivityLogPort,
      ) => new CreateClientUseCase(clients, catalogs, activityLog),
    },
    {
      provide: ListClientsUseCase,
      inject: [CLIENT_REPOSITORY, ADVISOR_CLIENT_ACCESS],
      useFactory: (
        clients: ClientRepository,
        advisorAccess: AdvisorClientAccessPort,
      ) => new ListClientsUseCase(clients, advisorAccess),
    },
    {
      provide: GetClientByIdUseCase,
      inject: [CLIENT_REPOSITORY, ADVISOR_CLIENT_ACCESS],
      useFactory: (
        clients: ClientRepository,
        advisorAccess: AdvisorClientAccessPort,
      ) => new GetClientByIdUseCase(clients, advisorAccess),
    },
    {
      provide: UpdateClientUseCase,
      inject: [
        CLIENT_REPOSITORY,
        CATALOG_VALIDATOR,
        ADVISOR_CLIENT_ACCESS,
        ACTIVITY_LOG,
      ],
      useFactory: (
        clients: ClientRepository,
        catalogs: CatalogValidatorPort,
        advisorAccess: AdvisorClientAccessPort,
        activityLog: ActivityLogPort,
      ) =>
        new UpdateClientUseCase(clients, catalogs, advisorAccess, activityLog),
    },
    {
      provide: ChangeClientStatusUseCase,
      inject: [CLIENT_REPOSITORY, ACTIVITY_LOG],
      useFactory: (clients: ClientRepository, activityLog: ActivityLogPort) =>
        new ChangeClientStatusUseCase(clients, activityLog),
    },
  ],
  exports: [
    CLIENT_REPOSITORY,
    // Exported for the contacts module (HU-04): it needs the advisor
    // visibility and the activity log of the client.
    ADVISOR_CLIENT_ACCESS,
    ACTIVITY_LOG,
    CreateClientUseCase,
    ListClientsUseCase,
    GetClientByIdUseCase,
    UpdateClientUseCase,
    ChangeClientStatusUseCase,
  ],
})
export class ClientsModule {}
