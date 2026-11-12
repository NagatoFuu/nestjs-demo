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

  afterEach(async () => {
    await app.close();
  });
});
