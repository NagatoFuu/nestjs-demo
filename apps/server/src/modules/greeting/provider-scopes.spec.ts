import { Injectable, Scope } from '@nestjs/common';
import { ContextIdFactory } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

@Injectable()
class DefaultScopeProvider {}

@Injectable({ scope: Scope.TRANSIENT })
class TransientScopeProvider {}

@Injectable()
class FirstConsumer {
  constructor(readonly dependency: TransientScopeProvider) {}
}

@Injectable()
class SecondConsumer {
  constructor(readonly dependency: TransientScopeProvider) {}
}

@Injectable({ scope: Scope.REQUEST })
class RequestScopeProvider {}

describe('Provider scopes', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DefaultScopeProvider,
        TransientScopeProvider,
        FirstConsumer,
        SecondConsumer,
        RequestScopeProvider,
      ],
    }).compile();
  });

  it('reuses a default-scoped provider in the same container', () => {
    const first = module.get(DefaultScopeProvider);
    const second = module.get(DefaultScopeProvider);

    expect(first).toBe(second);
  });

  it('creates a transient provider for each consumer', () => {
    const firstConsumer = module.get(FirstConsumer);
    const secondConsumer = module.get(SecondConsumer);

    expect(firstConsumer.dependency).not.toBe(secondConsumer.dependency);
  });

  it('reuses request-scoped providers only inside one context', async () => {
    const firstContext = ContextIdFactory.create();
    const secondContext = ContextIdFactory.create();

    const first = await module.resolve(RequestScopeProvider, firstContext);
    const firstAgain = await module.resolve(RequestScopeProvider, firstContext);
    const second = await module.resolve(RequestScopeProvider, secondContext);

    expect(first).toBe(firstAgain);
    expect(first).not.toBe(second);
  });
});
