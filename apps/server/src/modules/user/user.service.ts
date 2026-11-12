import { Injectable, NotFoundException } from '@nestjs/common';
import {
  parsePartialUserFields,
  parseRequiredUserFields,
} from './user-input.validation';
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
    return { ...this.getStoredUser(id) };
  }

  create(input: unknown): User {
    const fields = parseRequiredUserFields(input);
    const user: User = {
      id: String(this.nextId++),
      name: fields.name,
      email: fields.email,
    };

    this.users.push(user);
    return { ...user };
  }

  replace(id: string, input: unknown): User {
    const user = this.getStoredUser(id);
    const fields = parseRequiredUserFields(input);
    user.name = fields.name;
    user.email = fields.email;
    return { ...user };
  }

  update(id: string, input: unknown): User {
    const user = this.getStoredUser(id);
    const fields = parsePartialUserFields(input);
    if (fields.name !== undefined) {
      user.name = fields.name;
    }
    if (fields.email !== undefined) {
      user.email = fields.email;
    }
    return { ...user };
  }

  remove(id: string): void {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) {
      throw new NotFoundException(`User ${id} not found`);
    }

    this.users.splice(index, 1);
  }

  private getStoredUser(id: string): User {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }
}
