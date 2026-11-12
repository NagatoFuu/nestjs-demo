import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateUserInput } from './create-user.input';
import type { User } from './user.interface';

@Injectable()
export class UserService {
  private readonly users: User[] = [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: 'Bob', email: 'bob@example.com' },
  ];
  private nextId = 3;

  findAll(): User[] {
    // Keep callers from mutating the in-memory store through returned references.
    return this.users.map((user) => ({ ...user }));
  }

  findOne(id: string): User {
    const user = this.users.find((user) => user.id === id);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return { ...user };
  }

  create(input: CreateUserInput): User {
    const user: User = {
      id: String(this.nextId++),
      name: input.name,
      email: input.email,
    };

    this.users.push(user);
    return { ...user };
  }
}
