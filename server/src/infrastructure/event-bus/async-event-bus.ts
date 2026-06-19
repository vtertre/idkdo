import type {
  DomainEvent,
  DomainEventBusMiddleware,
  DomainEventHandlerRegistry,
  EventBus,
} from "@idkdo/patterns";

import { InvokeDomainEventHandlersMiddleware } from "./invoke-domain-event-handlers-middleware.js";

export type AsyncEventBusOptions = {
  readonly domainEventHandlerRegistry: DomainEventHandlerRegistry;
  readonly middlewares?: readonly DomainEventBusMiddleware[];
};

export class AsyncEventBus implements EventBus {
  private readonly middlewareChain: MiddlewareChainLink;

  constructor(options: AsyncEventBusOptions) {
    const finalChain = new MiddlewareChainLink(
      new InvokeDomainEventHandlersMiddleware(options.domainEventHandlerRegistry),
      null,
    );

    this.middlewareChain = (options.middlewares ?? []).reduceRight(
      (next, middleware) => new MiddlewareChainLink(middleware, next),
      finalChain,
    );
  }

  publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      void Promise.resolve()
        .then(() => this.middlewareChain.apply(event))
        .catch(() => undefined);
    }

    return Promise.resolve();
  }
}

class MiddlewareChainLink {
  constructor(
    private readonly current: DomainEventBusMiddleware,
    private readonly next: MiddlewareChainLink | null,
  ) {}

  apply(event: DomainEvent): Promise<void> {
    return this.current.intercept(
      event,
      () =>
        this.next?.apply(event) ??
        Promise.reject(new Error("Domain event middleware chain has no next link.")),
    );
  }
}
