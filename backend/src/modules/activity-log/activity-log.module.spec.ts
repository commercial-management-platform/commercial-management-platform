import { beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getDataSourceToken } from '@nestjs/typeorm';

import { validateEnv } from '../../config/env.validation.js';
import { ACTIVITY_LOG } from '../../shared/application/ports/activity-log.port.js';
import { ClientsModule } from '../clients/clients.module.js';
import { ContactsModule } from '../contacts/contacts.module.js';
import { PortfoliosModule } from '../portfolios/portfolios.module.js';
import { ActivityLogModule } from './activity-log.module.js';
import { GetClientActivityUseCase } from './application/use-cases/get-client-activity.use-case.js';
import { ACTIVITY_LOG_REPOSITORY } from './domain/ports/activity-log.repository.js';
import { TypeOrmActivityLogAdapter } from './infrastructure/adapters/typeorm-activity-log.adapter.js';
import { ClientActivityController } from './presentation/client-activity.controller.js';

/**
 * Wiring test of the activity log (HU-16). Compiles the real modules with a
 * simulated DataSource, so a missing export or a wrong token is detected
 * without a PostgreSQL. It also checks that the modules that record actions
 * (clients, contacts, portfolios) get the TypeORM adapter, not a no-op.
 *
 * Compiling the module graph imports most of the app, so the first test is
 * slow: hence the 60 s timeout, as in app.module.spec.ts.
 */
describe('ActivityLogModule', () => {
  beforeAll(() => {
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
      insert: async () => ({ identifiers: [] }),
      count: async () => 0,
      query: async () => [],
      create: (entity: unknown) => entity,
    };

    return {
      getRepository: () => repository,
      getMetadata: () => ({}),
      entityMetadatas: [],
      isInitialized: true,
      initialize: async () => undefined,
      destroy: async () => undefined,
      options: { type: 'postgres' },
      manager: { connection: {}, repositories: new Map() },
    };
  }

  @Global()
  @Module({
    providers: [
      { provide: getDataSourceToken(), useValue: createDataSourceFake() },
    ],
    exports: [getDataSourceToken()],
  })
  class FakeDataSourceModule {}

  async function compile(...modules: unknown[]) {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
        FakeDataSourceModule,
        ...(modules as []),
      ],
    }).compile();
  }

  it('compiles the history endpoint with the clients module', async () => {
    const moduleRef = await compile(ActivityLogModule);

    expect(moduleRef.get(ClientActivityController)).toBeDefined();
    expect(moduleRef.get(GetClientActivityUseCase)).toBeDefined();
    expect(moduleRef.get(ACTIVITY_LOG_REPOSITORY)).toBeDefined();

    await moduleRef.close();
  }, 60000);

  it.each([
    ['ClientsModule', ClientsModule],
    ['ContactsModule', ContactsModule],
    ['PortfoliosModule', PortfoliosModule],
  ])('binds ACTIVITY_LOG to the TypeORM adapter in %s', async (_, module) => {
    const moduleRef = await compile(module);

    expect(moduleRef.get(ACTIVITY_LOG, { strict: false })).toBeInstanceOf(
      TypeOrmActivityLogAdapter,
    );

    await moduleRef.close();
  }, 60000);
});
