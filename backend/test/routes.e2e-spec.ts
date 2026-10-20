import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
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
    // The date must not shift a day because of the server time zone.
    expect(created.body.startDate).toBe('2026-01-01');

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

  it('rejects invalid input with 400', async () => {
    const server = app.getHttpServer();
    await request(server).get('/api/routes/abc').expect(400);
    await request(server).post('/api/routes/1/clients/abc').expect(400);
    await request(server)
      .post('/api/routes')
      .send({
        name: 'RUT-TEST-004',
        zoneId: 1,
        advisorId: 1,
        startDate: '2026-01-01',
        status: 'lo-que-sea',
      })
      .expect(400);
    await request(server)
      .post('/api/routes')
      .send({
        name: 'RUT-TEST-005',
        zoneId: 1,
        advisorId: 1,
        startDate: '2026-01-01',
        suggestedStartTime: '99:99',
      })
      .expect(400);
  });

  it('honours visitOrder and rejects clients outside the route', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post('/api/routes')
      .send({
        name: 'RUT-TEST-006',
        zoneId: 1,
        advisorId: 1,
        startDate: '2026-01-01',
      })
      .expect(201);
    const id = created.body.id;
    await request(server).post(`/api/routes/${id}/clients/1`).expect(201);

    await request(server)
      .patch(`/api/routes/${id}/clients/order`)
      .send({ items: [{ clientId: 1, visitOrder: 5 }] })
      .expect(200);
    const clients = await request(server)
      .get(`/api/routes/${id}/clients`)
      .expect(200);
    expect(clients.body[0].visitOrder).toBe(5);

    await request(server)
      .patch(`/api/routes/${id}/clients/order`)
      .send({ clientIds: [1, 999999] })
      .expect(400);
  });

  it('swaps two visit orders and rejects a repeated one in the database', async () => {
    const server = app.getHttpServer();
    const dataSource = app.get(DataSource);
    const [second] = await dataSource.query(
      `INSERT INTO client (nit, business_name) VALUES ('900000002-' || floor(random() * 1e9), 'Second Client') RETURNING id`,
    );
    const created = await request(server)
      .post('/api/routes')
      .send({
        name: 'RUT-TEST-007',
        zoneId: 1,
        advisorId: 1,
        startDate: '2026-01-01',
      })
      .expect(201);
    const id = created.body.id;
    await request(server).post(`/api/routes/${id}/clients/1`).expect(201);
    await request(server)
      .post(`/api/routes/${id}/clients/${second.id}`)
      .expect(201);

    // Swapping 1 <-> 2 passes through a repeated order inside the
    // transaction; the deferred constraint only checks at commit.
    await request(server)
      .patch(`/api/routes/${id}/clients/order`)
      .send({ clientIds: [second.id, 1] })
      .expect(200);
    const clients = await request(server)
      .get(`/api/routes/${id}/clients`)
      .expect(200);
    const orderOf = (clientId: number) =>
      clients.body.find((c: { clientId: number }) => c.clientId === clientId)
        .visitOrder;
    expect(orderOf(second.id)).toBe(1);
    expect(orderOf(1)).toBe(2);

    await expect(
      dataSource.query(
        `UPDATE route_client SET visit_order = 1 WHERE route_id = $1`,
        [id],
      ),
    ).rejects.toThrow(/uq_route_client_route_visit_order/);
  });
});
