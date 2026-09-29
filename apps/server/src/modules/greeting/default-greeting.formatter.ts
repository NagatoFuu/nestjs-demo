import { Injectable } from '@nestjs/common';
import type { GreetingFormatter } from './greeting-formatter.interface';
import type { GreetingOptions } from './greeting-options.interface';

@Injectable()
export class DefaultGreetingFormatter implements GreetingFormatter {
  format(name: string, options: GreetingOptions): string {
    return `${options.salutation}, ${name}${options.punctuation}`;
  }
}
