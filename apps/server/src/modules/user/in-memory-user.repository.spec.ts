import { InMemoryUserRepository } from './in-memory-user.repository';

describe('InMemoryUserRepository', () => {
  let repository: InMemoryUserRepository;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
  });

  it('isolates list and detail snapshots from stored objects', () => {
    const users = repository.findAll();
    users[0].name = 'Changed';
    users.pop();
    const user = repository.findOne('1');
    expect(user).toBeDefined();
    user!.email = 'changed@example.com';
    expect(repository.findAll()).toHaveLength(2);
    expect(repository.findOne('1')).toEqual({
      id: '1',
      name: 'Alice',
      email: 'alice@example.com',
    });
  });

  it('copies creation input and output instead of retaining caller-owned data', () => {
    const input = { name: 'Carol', email: 'c@example.com' };
    const user = repository.create(input);
    input.name = 'Changed';
    user.email = 'changed@example.com';
    expect(repository.findOne('3')).toEqual({
      id: '3',
      name: 'Carol',
      email: 'c@example.com',
    });
  });

  it('preserves omitted fields in updates and isolates replacement results', () => {
    expect(repository.update('1', { name: 'Renamed' })?.email).toBe(
      'alice@example.com',
    );
    const user = repository.replace('1', {
      name: 'New',
      email: 'n@example.com',
    });
    expect(user).toBeDefined();
    user!.name = 'Changed';
    expect(repository.findOne('1')?.name).toBe('New');
  });

  it('reports missing records without HTTP exceptions or unrelated changes', () => {
    expect(repository.findOne('999')).toBeUndefined();
    expect(
      repository.replace('999', { name: 'New', email: 'n@example.com' }),
    ).toBeUndefined();
    expect(repository.update('999', { name: 'New' })).toBeUndefined();
    expect(repository.remove('999')).toBe(false);
    expect(repository.findAll().map((user) => user.id)).toEqual(['1', '2']);
  });

  it('does not reuse deleted IDs', () => {
    expect(repository.remove('2')).toBe(true);
    expect(
      repository.create({ name: 'Carol', email: 'c@example.com' }).id,
    ).toBe('3');
  });

  it('owns a separate data set and counter per repository instance', () => {
    repository.create({ name: 'Carol', email: 'c@example.com' });
    const second = new InMemoryUserRepository();
    expect(second.findAll()).toHaveLength(2);
    expect(second.create({ name: 'Dan', email: 'd@example.com' }).id).toBe('3');
  });
});
