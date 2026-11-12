import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { InMemoryUserRepository } from '../src/modules/user/in-memory-user.repository';

describe('Unexpected user storage failures (e2e)', () => {
  it('returns 500 without exposing internal error details', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(InMemoryUserRepository)
      .useValue({
        findAll: () => {
          throw new Error('sensitive storage detail');
        },
      })
      .compile();
    const app: INestApplication<App> = module.createNestApplication({
      logger: false,
    });
    await app.init();
    try {
      await request(app.getHttpServer())
        .get('/users')
        .expect(500)
        .expect({ statusCode: 500, message: 'Internal server error' });
    } finally {
      await app.close();
    }
  });
});
