import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { GreetingController } from './greeting.controller';
import { GreetingService } from './greeting.service';
import { LearningNote } from './learning-note.decorator';

describe('GreetingController', () => {
  let greetingController: GreetingController;
  let greetingService: jest.Mocked<
    Pick<GreetingService, 'getHello' | 'getHelloTo'>
  >;

  beforeEach(async () => {
    greetingService = {
      getHello: jest.fn().mockReturnValue('Controller test greeting'),
      getHelloTo: jest.fn().mockReturnValue('Hello, Codex!'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GreetingController],
      providers: [
        {
          provide: GreetingService,
          useValue: greetingService,
        },
      ],
    }).compile();

    greetingController = module.get<GreetingController>(GreetingController);
  });

  it('delegates greeting creation to GreetingService', () => {
    expect(greetingController.getHello()).toBe('Controller test greeting');
    expect(greetingService.getHello).toHaveBeenCalledTimes(1);
  });

  it('delegates the route name to GreetingService', () => {
    expect(greetingController.getHelloTo('Codex')).toBe('Hello, Codex!');
    expect(greetingService.getHelloTo).toHaveBeenCalledWith('Codex');
  });

  it('exposes learning metadata on the controller and route handler', () => {
    const reflector = new Reflector();
    const routeHandler = Object.getOwnPropertyDescriptor(
      GreetingController.prototype,
      'getHello',
    )?.value as GreetingController['getHello'] | undefined;

    expect(reflector.get(LearningNote, GreetingController)).toBe(
      'Greeting HTTP entry points',
    );
    expect(routeHandler).toBeDefined();
    expect(reflector.get(LearningNote, routeHandler!)).toBe(
      'Returns the configured greeting message',
    );

    const namedRouteHandler = Object.getOwnPropertyDescriptor(
      GreetingController.prototype,
      'getHelloTo',
    )?.value as GreetingController['getHelloTo'] | undefined;

    expect(namedRouteHandler).toBeDefined();
    expect(reflector.get(LearningNote, namedRouteHandler!)).toBe(
      'Returns a greeting for the route name',
    );
  });
});
