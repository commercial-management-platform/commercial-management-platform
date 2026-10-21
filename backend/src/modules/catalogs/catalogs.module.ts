import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CreateCatalogEntryUseCase } from './application/use-cases/create-catalog-entry.use-case.js';
import { GetCatalogEntriesUseCase } from './application/use-cases/get-catalog-entries.use-case.js';
import { SetCatalogEntryStatusUseCase } from './application/use-cases/set-catalog-entry-status.use-case.js';
import { UpdateCatalogEntryUseCase } from './application/use-cases/update-catalog-entry.use-case.js';

import { CatalogsController } from './infrastructure/http/controllers/catalogs.controller.js';

import { CatalogRepositoryImpl } from './infrastructure/repositories/catalog.repository.impl.js';

import { CatalogDao } from './infrastructure/persistence/daos/catalog.dao.js';

import { ZoneOrmEntity } from './infrastructure/persistence/entities/zone.orm-entity.js';
import { ClientTypeOrmEntity } from './infrastructure/persistence/entities/client-type.orm-entity.js';
import { ClientPotentialOrmEntity } from './infrastructure/persistence/entities/client-potential.orm-entity.js';
import { ClientStatusOrmEntity } from './infrastructure/persistence/entities/client-status.orm-entity.js';
import { VisitResultOrmEntity } from './infrastructure/persistence/entities/visit-result.orm-entity.js';
import { VisitObjectiveOrmEntity } from './infrastructure/persistence/entities/visit-objective.orm-entity.js';
import { VisitTypeOrmEntity } from './infrastructure/persistence/entities/visit-type.orm-entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZoneOrmEntity,
      ClientTypeOrmEntity,
      ClientPotentialOrmEntity,
      ClientStatusOrmEntity,
      VisitResultOrmEntity,
      VisitObjectiveOrmEntity,
      VisitTypeOrmEntity,
    ]),
  ],

  controllers: [CatalogsController],

  providers: [
    CatalogDao,

    {
      provide: 'CatalogRepository',
      useClass: CatalogRepositoryImpl,
    },

    GetCatalogEntriesUseCase,
    CreateCatalogEntryUseCase,
    UpdateCatalogEntryUseCase,
    SetCatalogEntryStatusUseCase,
  ],

  exports: ['CatalogRepository'],
})
export class CatalogsModule {}
