import {
  type DomainEvent,
  type DomainEventBusMiddleware,
  type DomainEventHandler,
  Uuid,
} from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it, vi } from "vitest";

import { AsyncEventBus } from "./async-event-bus.js";
import { StaticDomainEventHandlerRegistry } from "./static-domain-event-handler-registry.js";

describe("AsyncEventBus", () => {
  it("accepts publication before asynchronous handlers finish", async () => {
    const deferred = new Deferred();
    const handler = new DeferredDomainEventHandler(deferred);
    const eventBus = buildEventBus(handler);

    await eventBus.publish([new FakeDomainEvent()]);

    expect(handler.finished).toBe(false);

    deferred.resolve();
    await vi.waitFor(() => expect(handler.finished).toBe(true));
  });

  it("dispatches a batch in order through the middleware chain", async () => {
    const calls: string[] = [];
    const eventBus = new AsyncEventBus({
      domainEventHandlerRegistry: new StaticDomainEventHandlerRegistry([
        {
          eventClass: FakeDomainEvent,
          handler: new RecordingDomainEventHandler(calls),
        },
      ]),
      middlewares: [
        new OrderedDomainEventMiddleware("first", calls),
        new OrderedDomainEventMiddleware("second", calls),
      ],
    });

    await eventBus.publish([
      new FakeDomainEvent("one"),
      new FakeDomainEvent("two"),
    ]);
    await vi.waitFor(() =>
      expect(calls).toEqual([
        "first:one:before",
        "second:one:before",
        "handler:one",
        "first:two:before",
        "second:two:before",
        "handler:two",
        "second:one:after",
        "second:two:after",
        "first:one:after",
        "first:two:after",
      ]),
    );
  });
});

function buildEventBus(
  handler: DomainEventHandler<FakeDomainEvent>,
): AsyncEventBus {
  return new AsyncEventBus({
    domainEventHandlerRegistry: new StaticDomainEventHandlerRegistry([
      { eventClass: FakeDomainEvent, handler },
    ]),
  });
}

class FakeDomainEvent implements DomainEvent {
  readonly aggregateId = Uuid.random();
  readonly aggregateType = "Fake";
  readonly domainEventId = Uuid.random();
  readonly occurredAt = Temporal.Now.instant();

  constructor(readonly label = "event") {}
}

class DeferredDomainEventHandler
  implements DomainEventHandler<FakeDomainEvent>
{
  finished = false;

  constructor(private readonly deferred: Deferred) {}

  async handle(_event: FakeDomainEvent): Promise<void> {
    await this.deferred.promise;
    this.finished = true;
  }
}

class RecordingDomainEventHandler
  implements DomainEventHandler<FakeDomainEvent>
{
  constructor(private readonly calls: string[]) {}

  handle(event: FakeDomainEvent): Promise<void> {
    this.calls.push(`handler:${event.label}`);

    return Promise.resolve();
  }
}

class OrderedDomainEventMiddleware implements DomainEventBusMiddleware {
  constructor(
    private readonly name: string,
    private readonly calls: string[],
  ) {}

  async intercept(
    event: DomainEvent,
    next: () => Promise<void>,
  ): Promise<void> {
    const fakeEvent = event as FakeDomainEvent;
    this.calls.push(`${this.name}:${fakeEvent.label}:before`);
    await next();
    this.calls.push(`${this.name}:${fakeEvent.label}:after`);
  }
}

class Deferred {
  readonly promise: Promise<void>;
  private readonly resolvePromise: () => void;

  constructor() {
    let resolvePromise: (() => void) | undefined;
    this.promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    this.resolvePromise = resolvePromise!;
  }

  resolve(): void {
    this.resolvePromise();
  }
}
