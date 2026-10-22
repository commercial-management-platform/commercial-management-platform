import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ACTIVITY_LOG,
  type ActivityLogPort,
} from '../clients/application/ports/activity-log.port.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../clients/application/ports/advisor-client-access.port.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../clients/domain/repositories/client.repository.js';
import { ClientsModule } from '../clients/clients.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CatalogsModule } from '../catalogs/catalogs.module.js';
import type { CatalogRepository } from '../catalogs/domain/repositories/catalog.repository.js';
import { AssociateClientUseCase } from './application/use-cases/associate-client.use-case.js';
import { GetPortfolioClientsUseCase } from './application/use-cases/get-portfolio-clients.use-case.js';
import { GetPortfolioUseCase } from './application/use-cases/get-portfolio.use-case.js';
import { RemoveClientUseCase } from './application/use-cases/remove-client.use-case.js';
import {
  CLIENT_PORTFOLIO_REPOSITORY,
  type ClientPortfolioRepository,
} from './domain/repositories/client-portfolio.repository.js';
import { ClientPortfolioOrmEntity } from './infrastructure/persistence/entities/client-portfolio.orm-entity.js';
import { TypeOrmClientPortfolioRepository } from './infrastructure/repositories/typeorm-client-portfolio.repository.js';
import { PortfoliosController } from './presentation/portfolios.controller.js';

/**
 * Composition root of the portfolios module (HU-06). It is the only file that
 * knows every layer.
 *
 * The portfolios themselves belong to the catalogs module (HU-05): they are
 * seeded and they have no CRUD, so this module only reads them through the
 * catalog repository. The client repository, the advisor visibility and the
 * activity log come from the clients module (HU-03).
 *
 * AuthModule is imported because the controller uses the AuthGuard and the
 * RolesGuard: Nest builds the guards in the context of the module that
 * declares the controller, so the port of the auth service has to be visible
 * here.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ClientPortfolioOrmEntity]),
    AuthModule,
    CatalogsModule,
    ClientsModule,
  ],
  controllers: [PortfoliosController],
  providers: [
    {
      provide: CLIENT_PORTFOLIO_REPOSITORY,
      useClass: TypeOrmClientPortfolioRepository,
    },
    {
      provide: GetPortfolioUseCase,
      inject: ['CatalogRepository'],
      useFactory: (catalogs: CatalogRepository) =>
        new GetPortfolioUseCase(catalogs),
    },
    {
      provide: GetPortfolioClientsUseCase,
      inject: [
        'CatalogRepository',
        CLIENT_PORTFOLIO_REPOSITORY,
        CLIENT_REPOSITORY,
        ADVISOR_CLIENT_ACCESS,
      ],
      useFactory: (
        catalogs: CatalogRepository,
        clientPortfolios: ClientPortfolioRepository,
        clients: ClientRepository,
        advisorAccess: AdvisorClientAccessPort,
      ) =>
        new GetPortfolioClientsUseCase(
          catalogs,
          clientPortfolios,
          clients,
          advisorAccess,
        ),
    },
    {
      provide: AssociateClientUseCase,
      inject: [
        'CatalogRepository',
        CLIENT_PORTFOLIO_REPOSITORY,
        CLIENT_REPOSITORY,
        ACTIVITY_LOG,
      ],
      useFactory: (
        catalogs: CatalogRepository,
        clientPortfolios: ClientPortfolioRepository,
        clients: ClientRepository,
        activityLog: ActivityLogPort,
      ) =>
        new AssociateClientUseCase(
          catalogs,
          clientPortfolios,
          clients,
          activityLog,
        ),
    },
    {
      provide: RemoveClientUseCase,
      inject: ['CatalogRepository', CLIENT_PORTFOLIO_REPOSITORY, ACTIVITY_LOG],
      useFactory: (
        catalogs: CatalogRepository,
        clientPortfolios: ClientPortfolioRepository,
        activityLog: ActivityLogPort,
      ) =>
        new RemoveClientUseCase(catalogs, clientPortfolios, activityLog),
    },
  ],
  exports: [
    CLIENT_PORTFOLIO_REPOSITORY,
    GetPortfolioUseCase,
    GetPortfolioClientsUseCase,
    AssociateClientUseCase,
    RemoveClientUseCase,
  ],
})
export class PortfoliosModule {}
