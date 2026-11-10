import { Injectable } from '@nestjs/common';
import type { User } from './user.interface';

@Injectable()
export class UserService {
  private readonly users: User[] = [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: 'Bob', email: 'bob@example.com' },
  ];

  findAll(): User[] {
    // Keep callers from mutating the in-memory store through returned references.
    return this.users.map((user) => ({ ...user }));
  }
}
