import { BadRequestException } from '@nestjs/common';
import type { CreateUserInput } from './create-user.input';
import type { UpdateUserInput } from './update-user.input';

function readObject(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BadRequestException('Request body must be an object');
  }
  return input as Record<string, unknown>;
}

function readText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} must be a non-empty string`);
  }
  return value;
}

export function parseRequiredUserFields(input: unknown): CreateUserInput {
  const body = readObject(input);
  return {
    name: readText(body.name, 'name'),
    email: readText(body.email, 'email'),
  };
}

export function parsePartialUserFields(input: unknown): UpdateUserInput {
  const body = readObject(input);
  const result: UpdateUserInput = {};
  if (body.name !== undefined) {
    result.name = readText(body.name, 'name');
  }
  if (body.email !== undefined) {
    result.email = readText(body.email, 'email');
  }
  if (result.name === undefined && result.email === undefined) {
    throw new BadRequestException('Provide name or email');
  }
  return result;
}
