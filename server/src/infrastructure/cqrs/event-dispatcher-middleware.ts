import type {
  Command,
  CommandBusMiddleware,
  DomainEvent,
  EventBus,
} from "@idkdo/patterns";

export class EventDispatcherMiddleware implements CommandBusMiddleware {
  constructor(private readonly eventBus: EventBus) {}

  async intercept<TResult>(
    _command: Command<TResult>,
    next: () => Promise<[TResult, DomainEvent[]]>,
  ): Promise<[TResult, DomainEvent[]]> {
    const [result, domainEvents] = await next();

    await this.eventBus.publish(domainEvents);

    return [result, domainEvents];
  }
}
