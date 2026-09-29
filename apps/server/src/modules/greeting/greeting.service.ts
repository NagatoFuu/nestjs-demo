import { Inject, Injectable } from '@nestjs/common';
import { GREETING_FORMATTER, GREETING_OPTIONS } from './greeting.constants';
import type { GreetingFormatter } from './greeting-formatter.interface';
import type { GreetingOptions } from './greeting-options.interface';

@Injectable()
export class GreetingService {
  constructor(
    @Inject(GREETING_OPTIONS)
    private readonly options: GreetingOptions,
    @Inject(GREETING_FORMATTER)
    private readonly formatter: GreetingFormatter,
  ) {}

  getHello(): string {
    return this.getHelloTo(this.options.defaultName);
  }

  getHelloTo(name: string): string {
    return this.formatter.format(name, this.options);
  }
}
