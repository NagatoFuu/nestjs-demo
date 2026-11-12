import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it('returns the initial users', () => {
    expect(service.findAll()).toEqual([
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
    ]);
  });

  it('keeps the stored collection when a caller removes a returned user', () => {
    const users = service.findAll();

    users.pop();

    expect(service.findAll().map((user) => user.id)).toEqual(['1', '2']);
  });

  it('keeps the stored user when a caller edits a returned object', () => {
    const users = service.findAll();

    users[0].name = 'Changed outside the service';

    expect(service.findAll()[0].name).toBe('Alice');
  });

  it('returns the user matching the supplied ID', () => {
    expect(service.findOne('2')).toEqual({
      id: '2',
      name: 'Bob',
      email: 'bob@example.com',
    });
  });

  it('throws NotFoundException when the user does not exist', () => {
    expect(() => service.findOne('999')).toThrow(NotFoundException);
  });

  it('matches string IDs exactly without numeric conversion', () => {
    expect(() => service.findOne('01')).toThrow(NotFoundException);
  });

  it('keeps the stored user when a caller edits a returned detail', () => {
    const user = service.findOne('1');

    user.email = 'changed@example.com';

    expect(service.findOne('1').email).toBe('alice@example.com');
  });

  it('creates a user with a server-assigned ID and persists it in memory', () => {
    const user = service.create({ name: 'Carol', email: 'carol@example.com' });

    expect(user).toEqual({
      id: '3',
      name: 'Carol',
      email: 'carol@example.com',
    });
    expect(service.findOne('3')).toEqual(user);
  });

  it('assigns different IDs to successive creations', () => {
    const first = service.create({ name: 'Carol', email: 'carol@example.com' });
    const second = service.create({ name: 'Dan', email: 'dan@example.com' });

    expect(first.id).toBe('3');
    expect(second.id).toBe('4');
  });

  it('does not expose the stored object through the create result', () => {
    const user = service.create({ name: 'Carol', email: 'carol@example.com' });
    user.name = 'Changed outside the service';

    expect(service.findOne(user.id).name).toBe('Carol');
  });

  it('replaces every editable field while preserving the ID', () => {
    expect(
      service.replace('1', { name: 'New', email: 'new@example.com' }),
    ).toEqual({
      id: '1',
      name: 'New',
      email: 'new@example.com',
    });
    expect(service.findOne('1').email).toBe('new@example.com');
  });

  it('preserves fields omitted from a partial update', () => {
    expect(service.update('1', { name: 'Renamed' })).toEqual({
      id: '1',
      name: 'Renamed',
      email: 'alice@example.com',
    });
  });

  it.each(['replace', 'update'] as const)(
    '%s rejects an unknown ID',
    (method) => {
      expect(() =>
        service[method]('999', { name: 'New', email: 'new@example.com' }),
      ).toThrow(NotFoundException);
    },
  );

  it.each(['replace', 'update'] as const)(
    '%s returns a detached object',
    (method) => {
      const user = service[method]('1', {
        name: 'New',
        email: 'new@example.com',
      });
      user.name = 'External change';

      expect(service.findOne('1').name).toBe('New');
    },
  );
  it('removes only the requested user', () => {
    service.remove('1');
    expect(service.findAll().map((user) => user.id)).toEqual(['2']);
    expect(() => service.findOne('1')).toThrow(NotFoundException);
  });

  it('does not delete another user when the requested ID is absent', () => {
    expect(() => service.remove('999')).toThrow(NotFoundException);
    expect(service.findAll().map((user) => user.id)).toEqual(['1', '2']);
  });

  it('does not reuse an ID after deletion', () => {
    service.remove('2');
    expect(
      service.create({ name: 'Carol', email: 'carol@example.com' }).id,
    ).toBe('3');
  });
});
