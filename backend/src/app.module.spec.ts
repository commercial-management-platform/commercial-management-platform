import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { AuthController } from './modules/auth/presentation/auth.controller.js';
import { CatalogsController } from './modules/catalogs/presentation/catalogs.controller.js';
import { ClientsController } from './modules/clients/presentation/clients.controller.js';
import { ContactsController } from './modules/contacts/presentation/contacts.controller.js';
import { PortfoliosController } from './modules/portfolios/presentation/portfolios.controller.js';
import { UsersController } from './modules/users/presentation/users.controller.js';

// The configuration is validated when the app module is imported, so the
// values have to be set before the dynamic import.
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

/**
 * Wiring test of the application.
 *
 * The modules are joined by Nest, and every module that declares a controller
 * with the AuthGuard needs the auth module in its own scope, otherwise the
 * graph of dependencies does not resolve when the app starts. This test
 * compiles the real application module with a simulated DataSource, so a
 * missing import is detected without a PostgreSQL.
 */
describe('AppModule', () => {
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

  it('resolves the graph of dependencies of every module', async () => {
    const { AppModule } = await import('./app.module.js');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getDataSourceToken())
      .useValue(createDataSourceFake())
      .compile();

    expect(moduleRef.get(AuthController)).toBeDefined();
    expect(moduleRef.get(ClientsController)).toBeDefined();
    expect(moduleRef.get(ContactsController)).toBeDefined();
    expect(moduleRef.get(CatalogsController)).toBeDefined();
    expect(moduleRef.get(PortfoliosController)).toBeDefined();
    expect(moduleRef.get(UsersController)).toBeDefined();

    await moduleRef.close();
  }, 60000);
});
