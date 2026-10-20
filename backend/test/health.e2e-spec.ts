import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { DATABASE_HEALTH_PORT } from './../src/modules/health/domain/database-health.port.js';

// Requires the PostgreSQL from docker-compose.yml and backend/.env.
async function createApp(
  override?: (builder: ReturnType<typeof Test.createTestingModule>) => void,
): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  override?.(builder);
  const moduleFixture: TestingModule = await builder.compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

describe('GET /api/health (e2e)', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app?.close();
  });

  it('returns 200 with database up', async () => {
    app = await createApp();

    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('returns 503 with database down when SELECT 1 fails', async () => {
    app = await createApp((builder) =>
      builder
        .overrideProvider(DATABASE_HEALTH_PORT)
        .useValue({ isUp: () => Promise.resolve(false) }),
    );

    await request(app.getHttpServer())
      .get('/api/health')
      .expect(503)
      .expect({ status: 'error', database: 'down' });
  });

  it('serves the Swagger document', async () => {
    app = await createApp();

    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(response.body.paths).toHaveProperty('/api/health');
  });
});
