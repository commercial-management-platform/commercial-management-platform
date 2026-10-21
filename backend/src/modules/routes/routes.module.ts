import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import {
  CATALOG_LOOKUP,
  type CatalogLookupPort,
} from '../catalogs/application/ports/catalog-lookup.port.js';
import { CatalogsModule } from '../catalogs/catalogs.module.js';
import { ClientsModule } from '../clients/clients.module.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../clients/domain/repositories/client.repository.js';
import {
  ADVISOR_LOOKUP,
  type AdvisorLookupPort,
} from './application/ports/advisor-lookup.port.js';
import {
  ROUTE_REPOSITORY,
  type RouteRepository,
} from './domain/route.repository.js';
import { CreateRouteUseCase } from './application/create-route.use-case.js';
import { ListRoutesUseCase } from './application/list-routes.use-case.js';
import { GetRouteUseCase } from './application/get-route.use-case.js';
import { UpdateRouteUseCase } from './application/update-route.use-case.js';
import { GetRouteClientsUseCase } from './application/get-route-clients.use-case.js';
import { AssociateClientUseCase } from './application/associate-client.use-case.js';
import { RemoveClientUseCase } from './application/remove-client.use-case.js';
import { ReorderClientsUseCase } from './application/reorder-clients.use-case.js';
import { TypeOrmAdvisorLookupAdapter } from './infrastructure/adapters/typeorm-advisor-lookup.adapter.js';
import { TypeOrmRouteRepository } from './infrastructure/repositories/route.repository.impl.js';
import { RouteOrmEntity } from './infrastructure/persistence/entities/route.orm-entity.js';
import { RouteClientOrmEntity } from './infrastructure/persistence/entities/route-client.orm-entity.js';
import { RoutesController } from './presentation/routes.controller.js';

/**
 * Composition root of the routes module (HU-07).
 *
 * - CATALOG_LOOKUP (CatalogsModule): the zone must exist and be active.
 * - ADVISOR_LOOKUP: owned here, reads the advisor table of HU-02.
 * - CLIENT_REPOSITORY (ClientsModule): the client must exist to be associated.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([RouteOrmEntity, RouteClientOrmEntity]),
    AuthModule,
    CatalogsModule,
    ClientsModule,
  ],
  controllers: [RoutesController],
  providers: [
    { provide: ROUTE_REPOSITORY, useClass: TypeOrmRouteRepository },
    { provide: ADVISOR_LOOKUP, useClass: TypeOrmAdvisorLookupAdapter },
    {
      provide: CreateRouteUseCase,
      inject: [ROUTE_REPOSITORY, CATALOG_LOOKUP, ADVISOR_LOOKUP],
      useFactory: (
        repo: RouteRepository,
        catalogs: CatalogLookupPort,
        advisors: AdvisorLookupPort,
      ) => new CreateRouteUseCase(repo, catalogs, advisors),
    },
    {
      provide: ListRoutesUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: RouteRepository) => new ListRoutesUseCase(repo),
    },
    {
      provide: GetRouteUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: RouteRepository) => new GetRouteUseCase(repo),
    },
    {
      provide: UpdateRouteUseCase,
      inject: [ROUTE_REPOSITORY, CATALOG_LOOKUP, ADVISOR_LOOKUP],
      useFactory: (
        repo: RouteRepository,
        catalogs: CatalogLookupPort,
        advisors: AdvisorLookupPort,
      ) => new UpdateRouteUseCase(repo, catalogs, advisors),
    },
    {
      provide: GetRouteClientsUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: RouteRepository) => new GetRouteClientsUseCase(repo),
    },
    {
      provide: AssociateClientUseCase,
      inject: [ROUTE_REPOSITORY, CLIENT_REPOSITORY],
      useFactory: (routeRepo: RouteRepository, clientRepo: ClientRepository) =>
        new AssociateClientUseCase(routeRepo, clientRepo),
    },
    {
      provide: RemoveClientUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: RouteRepository) => new RemoveClientUseCase(repo),
    },
    {
      provide: ReorderClientsUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: RouteRepository) => new ReorderClientsUseCase(repo),
    },
  ],
})
export class RoutesModule {}
