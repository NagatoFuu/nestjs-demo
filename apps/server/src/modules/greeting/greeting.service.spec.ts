import { Test, TestingModule } from '@nestjs/testing';
import { GREETING_FORMATTER, GREETING_OPTIONS } from './greeting.constants';
import type { GreetingFormatter } from './greeting-formatter.interface';
import type { GreetingOptions } from './greeting-options.interface';
import { GreetingService } from './greeting.service';

describe('GreetingService', () => {
  let greetingService: GreetingService;
  let formatter: jest.Mocked<GreetingFormatter>;
  let formatGreeting: jest.MockedFunction<GreetingFormatter['format']>;

  const options: GreetingOptions = {
    salutation: 'Test hello',
    defaultName: 'tester',
    punctuation: '.',
  };

  beforeEach(async () => {
    formatGreeting = jest.fn(
      (name, config) => `${config.salutation}, ${name}${config.punctuation}`,
    );
    formatter = {
      format: formatGreeting,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GreetingService,
        {
          provide: GREETING_OPTIONS,
          useValue: options,
        },
        {
          provide: GREETING_FORMATTER,
          useValue: formatter,
        },
      ],
    }).compile();

    greetingService = module.get<GreetingService>(GreetingService);
  });

  it('greets the configured default name', () => {
    expect(greetingService.getHello()).toBe('Test hello, tester.');
    expect(formatGreeting).toHaveBeenCalledWith('tester', options);
  });

  it('greets the supplied name', () => {
    expect(greetingService.getHelloTo('Nest')).toBe('Test hello, Nest.');
    expect(formatGreeting).toHaveBeenCalledWith('Nest', options);
  });
});
