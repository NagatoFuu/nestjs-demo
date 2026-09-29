import { Controller, Get, Param } from '@nestjs/common';
import { GreetingService } from './greeting.service';
import { LearningNote } from './learning-note.decorator';

@LearningNote('Greeting HTTP entry points')
@Controller('greetings')
export class GreetingController {
  constructor(private readonly greetingService: GreetingService) {}

  @Get('hello')
  @LearningNote('Returns the configured greeting message')
  getHello(): string {
    return this.greetingService.getHello();
  }

  @Get('hello/:name')
  @LearningNote('Returns a greeting for the route name')
  getHelloTo(@Param('name') name: string): string {
    return this.greetingService.getHelloTo(name);
  }
}
