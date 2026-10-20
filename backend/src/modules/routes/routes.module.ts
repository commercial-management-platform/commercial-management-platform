import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClientsModule } from '../clients/clients.module.js';
import { CLIENT_REPOSITORY } from '../clients/domain/client.repository.js';
import { ROUTE_REPOSITORY } from './domain/route.repository.js';
import { CreateRouteUseCase } from './application/create-route.use-case.js';
import { ListRoutesUseCase } from './application/list-routes.use-case.js';
import { GetRouteUseCase } from './application/get-route.use-case.js';
import { UpdateRouteUseCase } from './application/update-route.use-case.js';
import { GetRouteClientsUseCase } from './application/get-route-clients.use-case.js';
import { AssociateClientUseCase } from './application/associate-client.use-case.js';
import { RemoveClientUseCase } from './application/remove-client.use-case.js';
import { ReorderClientsUseCase } from './application/reorder-clients.use-case.js';
import { TypeOrmRouteRepository } from './infrastructure/repositories/route.repository.impl.js';
import { RouteOrmEntity } from './infrastructure/persistence/entities/route.orm-entity.js';
import { RouteClientOrmEntity } from './infrastructure/persistence/entities/route-client.orm-entity.js';
import { RoutesController } from './presentation/routes.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RouteOrmEntity, RouteClientOrmEntity]),
    ClientsModule,
  ],
  controllers: [RoutesController],
  providers: [
    { provide: ROUTE_REPOSITORY, useClass: TypeOrmRouteRepository },
    {
      provide: CreateRouteUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: unknown) => new CreateRouteUseCase(repo as never),
    },
    {
      provide: ListRoutesUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: unknown) => new ListRoutesUseCase(repo as never),
    },
    {
      provide: GetRouteUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: unknown) => new GetRouteUseCase(repo as never),
    },
    {
      provide: UpdateRouteUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: unknown) => new UpdateRouteUseCase(repo as never),
    },
    {
      provide: GetRouteClientsUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: unknown) => new GetRouteClientsUseCase(repo as never),
    },
    {
      provide: AssociateClientUseCase,
      inject: [ROUTE_REPOSITORY, CLIENT_REPOSITORY],
      useFactory: (routeRepo: unknown, clientRepo: unknown) =>
        new AssociateClientUseCase(routeRepo as never, clientRepo as never),
    },
    {
      provide: RemoveClientUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: unknown) => new RemoveClientUseCase(repo as never),
    },
    {
      provide: ReorderClientsUseCase,
      inject: [ROUTE_REPOSITORY],
      useFactory: (repo: unknown) => new ReorderClientsUseCase(repo as never),
    },
  ],
})
export class RoutesModule {}
