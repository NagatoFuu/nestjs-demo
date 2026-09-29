import { Module } from '@nestjs/common';
import { GREETING_OPTIONS } from './greeting.constants';
import { GreetingOptions } from './greeting-options.interface';

const greetingOptions: GreetingOptions = {
  salutation: 'Hello',
  defaultName: 'learner',
  punctuation: '!',
};

@Module({
  providers: [
    {
      provide: GREETING_OPTIONS,
      useValue: greetingOptions,
    },
  ],
  exports: [GREETING_OPTIONS],
})
export class GreetingConfigModule {}
