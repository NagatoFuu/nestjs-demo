import { BadRequestException } from '@nestjs/common';
import {
  parsePartialUserFields,
  parseRequiredUserFields,
} from './user-input.validation';

describe('User input validation', () => {
  it.each([
    undefined,
    null,
    [],
    42,
    'text',
    {},
    { name: 'Alice' },
    { name: ' ', email: 'alice@example.com' },
    { name: 'Alice', email: 7 },
  ])('rejects invalid required fields: %p', (input) => {
    expect(() => parseRequiredUserFields(input)).toThrow(BadRequestException);
  });

  it.each([
    undefined,
    null,
    [],
    42,
    'text',
    {},
    { id: '9' },
    { name: null },
    { name: 'Alice', email: 7 },
  ])('rejects invalid partial fields: %p', (input) => {
    expect(() => parsePartialUserFields(input)).toThrow(BadRequestException);
  });

  it('selects only editable fields from a complete input', () => {
    expect(
      parseRequiredUserFields({
        id: '9',
        name: 'Alice',
        email: 'a@example.com',
      }),
    ).toEqual({ name: 'Alice', email: 'a@example.com' });
  });

  it('preserves omission in a valid partial input', () => {
    expect(parsePartialUserFields({ name: 'Alice', role: 'admin' })).toEqual({
      name: 'Alice',
    });
  });
});
