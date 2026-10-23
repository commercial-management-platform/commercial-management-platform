import { beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getDataSourceToken } from '@nestjs/typeorm';
import { validateEnv } from '../../config/env.validation.js';

import { CLIENT_REPOSITORY } from '../clients/domain/repositories/client.repository.js';
import { ADVISOR_CLIENT_ACCESS } from '../clients/application/ports/advisor-client-access.port.js';
import { ACTIVITY_LOG } from '../clients/application/ports/activity-log.port.js';
import { AssociateClientUseCase } from './application/use-cases/associate-client.use-case.js';
import { GetPortfolioClientsUseCase } from './application/use-cases/get-portfolio-clients.use-case.js';
import { GetPortfolioUseCase } from './application/use-cases/get-portfolio.use-case.js';
import { RemoveClientUseCase } from './application/use-cases/remove-client.use-case.js';
import { CLIENT_PORTFOLIO_REPOSITORY } from './domain/repositories/client-portfolio.repository.js';
import { PortfoliosController } from './presentation/portfolios.controller.js';
import { PortfoliosModule } from './portfolios.module.js';

/**
 * Wiring test of the portfolios module (HU-06).
 *
 * The module joins three modules: the portfolios own the association, the
 * catalogs module (HU-05) own the portfolios and the clients module (HU-03)
 * own the clients. This test compiles the real module with a simulated
 * DataSource, so a missing export or a wrong token is detected without a
 * PostgreSQL.
 */
describe('PortfoliosModule', () => {
  beforeAll(() => {
    // The configuration is validated when the module is compiled. No
    // connection is made: the DataSource is simulated.
    process.env.NODE_ENV ??= 'test';
    process.env.CORS_ORIGIN ??= 'http://localhost:5173';
    process.env.DB_HOST ??= 'localhost';
    process.env.DB_PORT ??= '5432';
    process.env.DB_USER ??= 'cmp_user';
    process.env.DB_PASSWORD ??= 'change_me';
    process.env.DB_NAME ??= 'cmp_db';
    process.env.DB_SSL ??= 'false';
    process.env.BETTER_AUTH_SECRET ??=
      'cmp_test_secret_key_at_least_32_chars_12345';
    process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
  });

  function createDataSourceFake() {
    const repository = {
      find: async () => [],
      findOne: async () => null,
      findBy: async () => [],
      save: async (entity: unknown) => entity,
      delete: async () => ({ affected: 0 }),
      count: async () => 0,
      query: async () => ({ records: [] }),
      create: (entity: unknown) => entity,
      createQueryBuilder: () => {
        const builder = {
          andWhere: () => builder,
          where: () => builder,
          orderBy: () => builder,
          getMany: async () => [],
          getOne: async () => null,
          getRawMany: async () => [],
        };
        return builder;
      },
    };

    return {
      getRepository: () => repository,
      getMetadata: () => ({}),
      // @nestjs/typeorm reads the metadata of the entity before it creates the
      // repository of each one.
      entityMetadatas: [],
      isInitialized: true,
      initialize: async () => undefined,
      destroy: async () => undefined,
      options: { type: 'postgres' },
      manager: { connection: {}, repositories: new Map() },
    };
  }

  /**
   * TypeOrmModule.forFeature resolves the DataSource of the root module, so
   * the simulated one has to be global.
   */
  @Global()
  @Module({
    providers: [
      { provide: getDataSourceToken(), useValue: createDataSourceFake() },
    ],
    exports: [getDataSourceToken()],
  })
  class FakeDataSourceModule {}

  async function compileModule() {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          cache: true,
          validate: validateEnv,
        }),
        FakeDataSourceModule,
        PortfoliosModule,
      ],
    }).compile();

    return moduleRef;
  }

  it('compiles with the catalogs and the clients modules', async () => {
    const moduleRef = await compileModule();

    expect(moduleRef.get(PortfoliosController)).toBeDefined();
    expect(moduleRef.get(GetPortfolioUseCase)).toBeDefined();
    expect(moduleRef.get(GetPortfolioClientsUseCase)).toBeDefined();
    expect(moduleRef.get(AssociateClientUseCase)).toBeDefined();
    expect(moduleRef.get(RemoveClientUseCase)).toBeDefined();

    await moduleRef.close();
  });

  it('binds the association repository and the ports of the other modules', async () => {
    const moduleRef = await compileModule();

    expect(moduleRef.get(CLIENT_PORTFOLIO_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(CLIENT_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(ADVISOR_CLIENT_ACCESS)).toBeDefined();
    expect(moduleRef.get(ACTIVITY_LOG)).toBeDefined();
    expect(moduleRef.get('CatalogRepository')).toBeDefined();

    await moduleRef.close();
  });
});
