import type { GreetingOptions } from './greeting-options.interface';

export interface GreetingFormatter {
  format(name: string, options: GreetingOptions): string;
}
