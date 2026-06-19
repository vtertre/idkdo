import {
  NoHandlerFoundError,
  type DomainEvent,
  type DomainEventHandler,
  type DomainEventHandlerRegistry,
  Uuid,
} from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { InvokeDomainEventHandlersMiddleware } from "./invoke-domain-event-handlers-middleware.js";

describe("InvokeDomainEventHandlersMiddleware", () => {
  it("invokes every handler in registry order", async () => {
    const calls: string[] = [];
    const middleware = new InvokeDomainEventHandlersMiddleware(
      new FakeDomainEventHandlerRegistry([
        new RecordingDomainEventHandler("first", calls),
        new RecordingDomainEventHandler("second", calls),
      ]),
    );

    await middleware.intercept(new FakeDomainEvent(), () => Promise.resolve());

    expect(calls).toEqual(["first", "second"]);
  });

  it("throws when no handler is registered", async () => {
    const middleware = new InvokeDomainEventHandlersMiddleware(
      new FakeDomainEventHandlerRegistry([]),
    );

    await expect(
      middleware.intercept(new FakeDomainEvent(), () => Promise.resolve()),
    ).rejects.toThrow(NoHandlerFoundError);
  });
});

class FakeDomainEvent implements DomainEvent {
  readonly aggregateId = Uuid.random();
  readonly aggregateType = "Fake";
  readonly domainEventId = Uuid.random();
  readonly occurredAt = Temporal.Now.instant();
}

class RecordingDomainEventHandler
  implements DomainEventHandler<FakeDomainEvent>
{
  constructor(
    private readonly name: string,
    private readonly calls: string[],
  ) {}

  handle(_event: FakeDomainEvent): Promise<void> {
    this.calls.push(this.name);

    return Promise.resolve();
  }
}

class FakeDomainEventHandlerRegistry
  implements DomainEventHandlerRegistry
{
  constructor(
    private readonly handlers: DomainEventHandler<FakeDomainEvent>[],
  ) {}

  getHandlers<TEvent extends DomainEvent>(
    _event: TEvent,
  ): DomainEventHandler<TEvent>[] {
    return this.handlers as DomainEventHandler<TEvent>[];
  }
}
