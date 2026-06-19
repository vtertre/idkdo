import type {
  DomainEvent,
  DomainEventHandler,
  DomainEventHandlerRegistry,
} from "@idkdo/patterns";

export type DomainEventClass = {
  readonly name: string;
};

export type DomainEventHandlerRegistration = {
  readonly eventClass: DomainEventClass;
  readonly handler: DomainEventHandler<DomainEvent>;
};

export class StaticDomainEventHandlerRegistry
  implements DomainEventHandlerRegistry
{
  private readonly handlers: ReadonlyMap<
    DomainEventClass,
    readonly DomainEventHandler<DomainEvent>[]
  >;

  constructor(registrations: readonly DomainEventHandlerRegistration[]) {
    const handlers = new Map<DomainEventClass, DomainEventHandler<DomainEvent>[]>();

    for (const registration of registrations) {
      const eventHandlers = handlers.get(registration.eventClass) ?? [];
      eventHandlers.push(registration.handler);
      handlers.set(registration.eventClass, eventHandlers);
    }

    this.handlers = handlers;
  }

  getHandlers<TEvent extends DomainEvent>(
    event: TEvent,
  ): DomainEventHandler<TEvent>[] {
    const handlers = this.handlers.get(event.constructor);

    if (!handlers) {
      return [];
    }

    return handlers as DomainEventHandler<TEvent>[];
  }
}
