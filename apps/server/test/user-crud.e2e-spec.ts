import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './helpers/create-test-app';

describe('User CRUD scenarios (e2e)', () => {
  let app: INestApplication<App>;
  beforeEach(async () => {
    app = await createTestApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('creates, reads, patches, replaces and deletes the same resource', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Carol', email: 'c@example.com' })
      .expect(201)
      .expect({ id: '3', name: 'Carol', email: 'c@example.com' });
    await request(app.getHttpServer())
      .get('/users/3')
      .expect(200)
      .expect({ id: '3', name: 'Carol', email: 'c@example.com' });
    await request(app.getHttpServer())
      .patch('/users/3')
      .send({ name: 'Renamed' })
      .expect(200)
      .expect({ id: '3', name: 'Renamed', email: 'c@example.com' });
    await request(app.getHttpServer())
      .put('/users/3')
      .send({ name: 'Replaced', email: 'r@example.com' })
      .expect(200)
      .expect({ id: '3', name: 'Replaced', email: 'r@example.com' });
    await request(app.getHttpServer())
      .delete('/users/3')
      .expect(204)
      .expect('');
    await request(app.getHttpServer()).get('/users/3').expect(404);
    await request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect([
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ]);
  });

  it('isolates memory and ID counters between application containers', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Carol', email: 'c@example.com' })
      .expect(201);
    const second = await createTestApp();
    try {
      await request(second.getHttpServer()).get('/users/3').expect(404);
      await request(second.getHttpServer())
        .post('/users')
        .send({ name: 'Dan', email: 'd@example.com' })
        .expect(201)
        .expect({ id: '3', name: 'Dan', email: 'd@example.com' });
      await request(app.getHttpServer())
        .get('/users/3')
        .expect(200)
        .expect({ id: '3', name: 'Carol', email: 'c@example.com' });
    } finally {
      await second.close();
    }
  });
});
