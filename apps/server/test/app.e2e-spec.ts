import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/greetings/hello (GET)', () => {
    return request(app.getHttpServer())
      .get('/greetings/hello')
      .expect(200)
      .expect('Hello, learner!');
  });

  it('/greetings/hello/:name (GET)', () => {
    return request(app.getHttpServer())
      .get('/greetings/hello/Nest')
      .expect(200)
      .expect('Hello, Nest!');
  });

  it('/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect([
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ]);
  });

  it('/users/:id (GET) returns the requested user', () => {
    return request(app.getHttpServer())
      .get('/users/2')
      .expect(200)
      .expect({ id: '2', name: 'Bob', email: 'bob@example.com' });
  });

  it('/users/:id (GET) returns 404 when the user does not exist', () => {
    return request(app.getHttpServer()).get('/users/999').expect(404).expect({
      message: 'User 999 not found',
      error: 'Not Found',
      statusCode: 404,
    });
  });

  it('/users/:id (GET) preserves the string ID without numeric conversion', () => {
    return request(app.getHttpServer()).get('/users/01').expect(404).expect({
      message: 'User 01 not found',
      error: 'Not Found',
      statusCode: 404,
    });
  });

  it('/users (POST) creates a user that can be queried', async () => {
    const user = { id: '3', name: 'Carol', email: 'carol@example.com' };

    await request(app.getHttpServer())
      .post('/users')
      .send({ name: user.name, email: user.email })
      .expect(201)
      .expect(user);
    await request(app.getHttpServer()).get('/users/3').expect(200).expect(user);
  });

  it('/users (POST) assigns the ID instead of trusting extra body fields', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({
        id: '999',
        name: 'Carol',
        email: 'carol@example.com',
        role: 'admin',
      })
      .expect(201)
      .expect({ id: '3', name: 'Carol', email: 'carol@example.com' });
  });

  it('/users (POST) assigns successive IDs inside the same application', async () => {
    for (const id of ['3', '4']) {
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Carol', email: 'carol@example.com' })
        .expect(201)
        .expect({ id, name: 'Carol', email: 'carol@example.com' });
    }
  });

  it('/users/:id (PUT) replaces editable fields and persists the result', async () => {
    const user = { id: '1', name: 'New', email: 'new@example.com' };
    await request(app.getHttpServer())
      .put('/users/1')
      .send({ name: user.name, email: user.email })
      .expect(200)
      .expect(user);
    await request(app.getHttpServer()).get('/users/1').expect(200).expect(user);
  });

  it('/users/:id (PATCH) preserves omitted fields', () => {
    return request(app.getHttpServer())
      .patch('/users/1')
      .send({ name: 'Renamed' })
      .expect(200)
      .expect({ id: '1', name: 'Renamed', email: 'alice@example.com' });
  });

  it('/users/:id (PATCH) cannot change the ID or introduce extra fields', () => {
    return request(app.getHttpServer())
      .patch('/users/1')
      .send({ id: '999', name: 'Renamed', role: 'admin' })
      .expect(200)
      .expect({ id: '1', name: 'Renamed', email: 'alice@example.com' });
  });

  it('/users/:id (PUT) does not create a missing resource', () => {
    return request(app.getHttpServer())
      .put('/users/999')
      .send({ name: 'New', email: 'new@example.com' })
      .expect(404);
  });

  it('/users/:id (DELETE) returns an empty 204 response and removes the user', async () => {
    await request(app.getHttpServer())
      .delete('/users/1')
      .expect(204)
      .expect('');
    await request(app.getHttpServer()).get('/users/1').expect(404);
  });

  it('/users/:id (DELETE) returns 404 on repetition without removing another user', async () => {
    await request(app.getHttpServer()).delete('/users/1').expect(204);
    await request(app.getHttpServer()).delete('/users/1').expect(404);
    await request(app.getHttpServer()).get('/users/2').expect(200);
  });

  it('/users (GET) returns 200 and an empty collection after all users are removed', async () => {
    await request(app.getHttpServer()).delete('/users/1').expect(204);
    await request(app.getHttpServer()).delete('/users/2').expect(204);
    await request(app.getHttpServer()).get('/users').expect(200).expect([]);
  });

  it('/users (POST) does not reuse an ID after deletion', async () => {
    await request(app.getHttpServer()).delete('/users/2').expect(204);
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Carol', email: 'carol@example.com' })
      .expect(201)
      .expect({ id: '3', name: 'Carol', email: 'carol@example.com' });
  });

  afterEach(async () => {
    await app.close();
  });
});
