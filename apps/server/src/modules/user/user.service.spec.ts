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
});
