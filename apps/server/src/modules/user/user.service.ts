import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateUserInput } from './create-user.input';
import type { ReplaceUserInput } from './replace-user.input';
import type { UpdateUserInput } from './update-user.input';
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

  replace(id: string, input: ReplaceUserInput): User {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    user.name = input.name;
    user.email = input.email;
    return { ...user };
  }

  update(id: string, input: UpdateUserInput): User {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (input.name !== undefined) {
      user.name = input.name;
    }
    if (input.email !== undefined) {
      user.email = input.email;
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
}
