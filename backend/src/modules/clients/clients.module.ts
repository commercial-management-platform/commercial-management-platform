import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogWriterModule } from '../activity-log/activity-log-writer.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CatalogsModule } from '../catalogs/catalogs.module.js';
import type { CatalogRepository } from '../catalogs/domain/repositories/catalog.repository.js';
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
import { GetClientImportTemplateUseCase } from './application/use-cases/get-client-import-template.use-case.js';
import { GetClientByIdUseCase } from './application/use-cases/get-client-by-id.use-case.js';
import { ImportClientsUseCase } from './application/use-cases/import-clients.use-case.js';
import { ListClientsUseCase } from './application/use-cases/list-clients.use-case.js';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from './domain/repositories/client.repository.js';
import {
  CLIENT_IMPORT_READER,
  type ClientImportReaderPort,
} from './domain/ports/client-import-reader.port.js';
import {
  CLIENT_IMPORT_STORAGE,
  type ClientImportStoragePort,
} from './domain/ports/client-import-storage.port.js';
import {
  CLIENT_IMPORT_REPOSITORY,
  type ClientImportRepository,
} from './domain/ports/client-import.repository.js';
import { CatalogLookupValidatorAdapter } from './infrastructure/adapters/catalog-lookup-validator.adapter.js';
import { TypeOrmAdvisorClientAccessAdapter } from './infrastructure/adapters/typeorm-advisor-client-access.adapter.js';
import { CsvClientReader } from './infrastructure/csv/csv-client-reader.js';
import { ClientImportOrmEntity } from './infrastructure/persistence/entities/client-import.orm-entity.js';
import { ClientOrmEntity } from './infrastructure/persistence/entities/client.orm-entity.js';
import { TypeOrmClientImportRepository } from './infrastructure/repositories/typeorm-client-import.repository.js';
import { TypeOrmClientRepository } from './infrastructure/repositories/typeorm-client.repository.js';
import { PendingClientImportStorageAdapter } from './infrastructure/storage/pending-client-import-storage.adapter.js';
import { ClientImportController } from './presentation/client-import.controller.js';
import { ClientsController } from './presentation/clients.controller.js';

/**
 * Composition root of the clients module (HU-03). It is the only file that
 * knows every layer: each port is wired to its infrastructure adapter.
 *
 * CATALOG_VALIDATOR uses the catalog lookup exported by CatalogsModule
 * (HU-05): only active catalog entries can be assigned.
 *
 * ACTIVITY_LOG comes from ActivityLogWriterModule (HU-16), which writes into
 * activity_log; it is re-exported for contacts and portfolios.
 *
 * Deferred adapters until other stories are merged:
 * - ADVISOR_CLIENT_ACCESS → HU-07 (advisors/routes), denies every advisor
 *   until those tables exist.
 * - CLIENT_IMPORT_STORAGE → HU-20 (files in S3): the CSV of an import gets
 *   its key but is not uploaded yet.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ClientOrmEntity, ClientImportOrmEntity]),
    AuthModule,
    CatalogsModule,
    ActivityLogWriterModule,
  ],
  // ClientImportController first: its static paths must win over GET /clients/:id.
  controllers: [ClientImportController, ClientsController],
  providers: [
    { provide: CLIENT_REPOSITORY, useClass: TypeOrmClientRepository },
    { provide: CATALOG_VALIDATOR, useClass: CatalogLookupValidatorAdapter },
    {
      provide: ADVISOR_CLIENT_ACCESS,
      useClass: TypeOrmAdvisorClientAccessAdapter,
    },
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
    // Import from CSV (HU-22).
    { provide: CLIENT_IMPORT_READER, useClass: CsvClientReader },
    { provide: CLIENT_IMPORT_REPOSITORY, useClass: TypeOrmClientImportRepository },
    { provide: CLIENT_IMPORT_STORAGE, useClass: PendingClientImportStorageAdapter },
    {
      provide: GetClientImportTemplateUseCase,
      inject: ['CatalogRepository'],
      useFactory: (catalogs: CatalogRepository) => new GetClientImportTemplateUseCase(catalogs),
    },
    {
      provide: ImportClientsUseCase,
      inject: [
        CLIENT_IMPORT_READER,
        CLIENT_IMPORT_REPOSITORY,
        CLIENT_IMPORT_STORAGE,
        'CatalogRepository',
        ACTIVITY_LOG,
      ],
      useFactory: (
        reader: ClientImportReaderPort,
        imports: ClientImportRepository,
        storage: ClientImportStoragePort,
        catalogs: CatalogRepository,
        activityLog: ActivityLogPort,
      ) => new ImportClientsUseCase(reader, imports, storage, catalogs, activityLog),
    },
  ],
  exports: [
    CLIENT_REPOSITORY,
    // Exported for the contacts module (HU-04): it needs the advisor
    // visibility and the activity log of the client.
    ADVISOR_CLIENT_ACCESS,
    ActivityLogWriterModule,
    CreateClientUseCase,
    ListClientsUseCase,
    GetClientByIdUseCase,
    UpdateClientUseCase,
    ChangeClientStatusUseCase,
  ],
})
export class ClientsModule {}
