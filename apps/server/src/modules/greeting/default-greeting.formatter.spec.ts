import { DefaultGreetingFormatter } from './default-greeting.formatter';

describe('DefaultGreetingFormatter', () => {
  it('formats a name with the configured greeting parts', () => {
    const formatter = new DefaultGreetingFormatter();

    expect(
      formatter.format('Nest', {
        salutation: 'Hello',
        defaultName: 'learner',
        punctuation: '!',
      }),
    ).toBe('Hello, Nest!');
  });
});
