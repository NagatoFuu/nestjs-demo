import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

export async function createTestApp(): Promise<INestApplication<App>> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app: INestApplication<App> = module.createNestApplication();
  await app.init();
  return app;
}
