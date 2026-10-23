import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ActivityLogWriterModule } from '../activity-log/activity-log-writer.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CatalogsModule } from '../catalogs/catalogs.module.js';
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
import { ImportClientsUseCase } from './application/use-cases/import-clients.use-case.js';
import { ListClientsUseCase } from './application/use-cases/list-clients.use-case.js';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from './domain/repositories/client.repository.js';
import {
  CLIENT_IMPORT_REPOSITORY,
  type ClientImportRepository,
} from './domain/ports/client-import.repository.js';
import { CLIENT_IMPORT_STORAGE } from './domain/ports/client-import-storage.port.js';
import { CatalogLookupValidatorAdapter } from './infrastructure/adapters/catalog-lookup-validator.adapter.js';
import { TypeOrmAdvisorClientAccessAdapter } from './infrastructure/adapters/typeorm-advisor-client-access.adapter.js';
import { ClientImportOrmEntity } from './infrastructure/persistence/entities/client-import.orm-entity.js';
import { ClientOrmEntity } from './infrastructure/persistence/entities/client.orm-entity.js';
import { TypeOrmClientImportRepository } from './infrastructure/repositories/typeorm-client-import.repository.js';
import { TypeOrmClientRepository } from './infrastructure/repositories/typeorm-client.repository.js';
import { ClientsController } from './presentation/clients.controller.js';

/**
 * Composition root of the clients module (HU-03). It is the only file that
 * knows every layer: each port is wired to its infrastructure adapter.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ClientOrmEntity, ClientImportOrmEntity]),
    AuthModule,
    CatalogsModule,
    ActivityLogWriterModule,
  ],
  controllers: [ClientsController],
  providers: [
    { provide: CLIENT_REPOSITORY, useClass: TypeOrmClientRepository },
    { provide: CLIENT_IMPORT_REPOSITORY, useClass: TypeOrmClientImportRepository },
    { provide: CATALOG_VALIDATOR, useClass: CatalogLookupValidatorAdapter },
    {
      provide: CLIENT_IMPORT_STORAGE,
      useValue: {
        save: async (file: { originalname?: string; buffer: Buffer }) => ({
          fileKey: `clients-imports/${Date.now()}-${file.originalname ?? 'import.csv'}`,
        }),
      },
    },
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
    {
      provide: ImportClientsUseCase,
      inject: [
        CLIENT_REPOSITORY,
        CLIENT_IMPORT_REPOSITORY,
        CLIENT_IMPORT_STORAGE,
        'CatalogRepository',
        DataSource,
      ],
      useFactory: (
        clients: ClientRepository,
        clientImports: ClientImportRepository,
        storage: { save: (file: { originalname?: string; buffer: Buffer }) => Promise<{ fileKey: string }> },
        catalogs: any,
        dataSource: DataSource,
      ) =>
        new ImportClientsUseCase(
          clients,
          clientImports,
          storage,
          catalogs,
          dataSource,
        ),
    },
  ],
  exports: [
    CLIENT_REPOSITORY,
    ADVISOR_CLIENT_ACCESS,
    ActivityLogWriterModule,
    CreateClientUseCase,
    ListClientsUseCase,
    GetClientByIdUseCase,
    UpdateClientUseCase,
    ChangeClientStatusUseCase,
    ImportClientsUseCase,
  ],
})
export class ClientsModule {}
