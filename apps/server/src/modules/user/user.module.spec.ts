import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { InMemoryUserRepository } from './in-memory-user.repository';
import { UserModule } from './user.module';
import { UserService } from './user.service';

@Injectable()
class ServiceConsumer {
  constructor(readonly service: UserService) {}
}

@Injectable()
class RepositoryConsumer {
  constructor(readonly repository: InMemoryUserRepository) {}
}

describe('UserModule architecture', () => {
  it.each([
    { name: 'UserService', consumer: ServiceConsumer },
    { name: 'InMemoryUserRepository', consumer: RepositoryConsumer },
  ])('keeps $name private from importing modules', async ({ consumer }) => {
    await expect(
      Test.createTestingModule({
        imports: [UserModule],
        providers: [consumer],
      }).compile(),
    ).rejects.toThrow(/Nest can't resolve dependencies/);
  });

  it('injects the registered repository instance into UserService', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    try {
      const context = module.select(UserModule);
      const repository = context.get(InMemoryUserRepository, { strict: true });
      const service = context.get(UserService, { strict: true });
      const user = service.create({
        name: 'Module test',
        email: 'module@example.com',
      });
      expect(repository.findOne(user.id)).toEqual(user);
      expect(context.get(InMemoryUserRepository, { strict: true })).toBe(
        repository,
      );
    } finally {
      await module.close();
    }
  });
});
