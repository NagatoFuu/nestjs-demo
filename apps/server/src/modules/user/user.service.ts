import { Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryUserRepository } from './in-memory-user.repository';
import {
  parsePartialUserFields,
  parseRequiredUserFields,
} from './user-input.validation';
import type { User } from './user.interface';

@Injectable()
export class UserService {
  constructor(private readonly repository: InMemoryUserRepository) {}

  findAll(): User[] {
    return this.repository.findAll();
  }

  findOne(id: string): User {
    return this.requireUser(this.repository.findOne(id), id);
  }

  create(input: unknown): User {
    const fields = parseRequiredUserFields(input);
    return this.repository.create(fields);
  }

  replace(id: string, input: unknown): User {
    this.findOne(id);
    const fields = parseRequiredUserFields(input);
    return this.requireUser(this.repository.replace(id, fields), id);
  }

  update(id: string, input: unknown): User {
    this.findOne(id);
    const fields = parsePartialUserFields(input);
    return this.requireUser(this.repository.update(id, fields), id);
  }

  remove(id: string): void {
    if (!this.repository.remove(id)) {
      throw new NotFoundException(`User ${id} not found`);
    }
  }

  private requireUser(user: User | undefined, id: string): User {
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }
}
