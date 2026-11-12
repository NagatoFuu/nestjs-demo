import { Injectable } from '@nestjs/common';
import type { CreateUserInput } from './create-user.input';
import type { ReplaceUserInput } from './replace-user.input';
import type { UpdateUserInput } from './update-user.input';
import type { User } from './user.interface';

@Injectable()
export class InMemoryUserRepository {
  private readonly users: User[] = [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: 'Bob', email: 'bob@example.com' },
  ];
  private nextId = 3;

  findAll(): User[] {
    return this.users.map((user) => ({ ...user }));
  }

  findOne(id: string): User | undefined {
    const user = this.users.find((user) => user.id === id);
    return user ? { ...user } : undefined;
  }

  create(input: CreateUserInput): User {
    const user = {
      id: String(this.nextId++),
      name: input.name,
      email: input.email,
    };
    this.users.push(user);
    return { ...user };
  }

  replace(id: string, input: ReplaceUserInput): User | undefined {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) {
      return undefined;
    }
    const user = { id, name: input.name, email: input.email };
    this.users[index] = user;
    return { ...user };
  }

  update(id: string, input: UpdateUserInput): User | undefined {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      return undefined;
    }
    if (input.name !== undefined) {
      user.name = input.name;
    }
    if (input.email !== undefined) {
      user.email = input.email;
    }
    return { ...user };
  }

  remove(id: string): boolean {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) {
      return false;
    }
    this.users.splice(index, 1);
    return true;
  }
}
