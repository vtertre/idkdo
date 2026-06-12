import {
  type Command,
  type DomainEvent,
  type EventBus,
  Uuid,
  type commandResultType,
} from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { EventDispatcherMiddleware } from "./event-dispatcher-middleware.js";

describe("EventDispatcherMiddleware", () => {
  it("dispatches domain events returned by later command middleware", async () => {
    const eventBus = new RecordingEventBus();
    const middleware = new EventDispatcherMiddleware(eventBus);
    const commandResult = Uuid.random();
    const domainEvents = [new FakeDomainEvent()];

    const [result, returnedDomainEvents] = await middleware.intercept(
      new FakeCommand(),
      () => Promise.resolve([commandResult, domainEvents]),
    );

    expect(result.equals(commandResult)).toBe(true);
    expect(returnedDomainEvents).toBe(domainEvents);
    expect(eventBus.dispatchedEvents).toBe(domainEvents);
  });

  it("does not dispatch domain events when later command middleware rejects", async () => {
    const eventBus = new RecordingEventBus();
    const middleware = new EventDispatcherMiddleware(eventBus);
    const error = new Error("Command failed.");

    await expect(
      middleware.intercept(new FakeCommand(), () => Promise.reject(error)),
    ).rejects.toBe(error);

    expect(eventBus.dispatchedEvents).toBeUndefined();
  });
});

class FakeCommand implements Command<Uuid> {
  declare readonly [commandResultType]: Uuid;
}

class FakeDomainEvent implements DomainEvent {
  readonly aggregateId = Uuid.random();
  readonly aggregateType = "Fake";
  readonly domainEventId = Uuid.random();
  readonly occurredAt = Temporal.Now.instant();
}

class RecordingEventBus implements EventBus {
  dispatchedEvents: readonly DomainEvent[] | undefined;

  publish(events: DomainEvent[]): Promise<void> {
    this.dispatchedEvents = events;

    return Promise.resolve();
  }
}
