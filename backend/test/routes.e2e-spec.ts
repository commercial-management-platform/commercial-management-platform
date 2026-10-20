import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';

describe('routes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, lists, gets and updates a route', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/routes')
      .send({
        name: 'RUT-TEST-001',
        zoneId: 1,
        advisorId: 1,
        startDate: '2026-01-01',
        status: 'active',
      })
      .expect(201);
    const id = created.body.id;

    await request(app.getHttpServer()).get('/api/routes').expect(200);
    await request(app.getHttpServer()).get(`/api/routes/${id}`).expect(200);
    await request(app.getHttpServer())
      .patch(`/api/routes/${id}`)
      .send({ description: 'updated' })
      .expect(200);
  });

  it('associates, rejects duplicate, removes and reorders clients', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/routes')
      .send({
        name: 'RUT-TEST-002',
        zoneId: 1,
        advisorId: 1,
        startDate: '2026-01-01',
        status: 'active',
      })
      .expect(201);
    const id = created.body.id;

    await request(app.getHttpServer())
      .post(`/api/routes/${id}/clients/1`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/routes/${id}/clients/1`)
      .expect(409);
    const clients = await request(app.getHttpServer())
      .get(`/api/routes/${id}/clients`)
      .expect(200);
    expect(clients.body.length).toBe(1);

    await request(app.getHttpServer())
      .patch(`/api/routes/${id}/clients/order`)
      .send({ clientIds: [1] })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/routes/${id}/clients/1`)
      .expect(200);
    const after = await request(app.getHttpServer())
      .get(`/api/routes/${id}/clients`)
      .expect(200);
    expect(after.body.length).toBe(0);
  });

  it('rejects non-existent route or client', async () => {
    await request(app.getHttpServer()).get('/api/routes/999999').expect(404);
    const created = await request(app.getHttpServer())
      .post('/api/routes')
      .send({
        name: 'RUT-TEST-003',
        zoneId: 1,
        advisorId: 1,
        startDate: '2026-01-01',
        status: 'active',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/routes/${created.body.id}/clients/999999`)
      .expect(404);
  });
});
