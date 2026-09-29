import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { GreetingModule } from './greeting.module';
import { GreetingService } from './greeting.service';

describe('Module boundaries', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('keeps GreetingService private to GreetingModule', () => {
    const appModuleContext = module.select(AppModule);

    expect(() =>
      appModuleContext.get(GreetingService, { strict: true }),
    ).toThrow();
  });

  it('makes GreetingService available inside GreetingModule', () => {
    const greetingModuleContext = module.select(GreetingModule);

    expect(
      greetingModuleContext.get(GreetingService, { strict: true }),
    ).toBeInstanceOf(GreetingService);
  });
});
