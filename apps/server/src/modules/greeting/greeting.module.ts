import { Module } from '@nestjs/common';
import { GreetingController } from './greeting.controller';
import { GreetingConfigModule } from './greeting-config.module';
import { GreetingService } from './greeting.service';
import { GREETING_FORMATTER } from './greeting.constants';
import { DefaultGreetingFormatter } from './default-greeting.formatter';

@Module({
  imports: [GreetingConfigModule],
  controllers: [GreetingController],
  providers: [
    GreetingService,
    {
      provide: GREETING_FORMATTER,
      useClass: DefaultGreetingFormatter,
    },
  ],
})
export class GreetingModule {}
