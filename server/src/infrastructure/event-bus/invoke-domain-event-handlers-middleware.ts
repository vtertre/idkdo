import type {
  DomainEvent,
  DomainEventBusMiddleware,
  DomainEventHandlerRegistry,
} from "@idkdo/patterns";
import { NoHandlerFoundError } from "@idkdo/patterns";

export class InvokeDomainEventHandlersMiddleware
  implements DomainEventBusMiddleware
{
  constructor(private readonly domainEventHandlerRegistry: DomainEventHandlerRegistry) {}

  async intercept(
    event: DomainEvent,
    _next: () => Promise<void>,
  ): Promise<void> {
    const handlers = this.domainEventHandlerRegistry.getHandlers(event);

    if (handlers.length === 0) {
      throw new NoHandlerFoundError(event.constructor);
    }

    for (const handler of handlers) {
      await handler.handle(event);
    }
  }
}
