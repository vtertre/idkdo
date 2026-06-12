import { type DomainEvent, Uuid } from "@idkdo/patterns";
import type { Temporal } from "@js-temporal/polyfill";

import type { EventName } from "../value-objects/event-name.js";

export type EventCreatedInput = {
  readonly eventId: Uuid;
  readonly name: EventName;
  readonly occurredAt: Temporal.Instant;
};

export class EventCreated implements DomainEvent {
  readonly aggregateType = "Event";
  readonly domainEventId = Uuid.random();

  constructor(
    readonly eventId: Uuid,
    readonly name: EventName,
    readonly occurredAt: Temporal.Instant,
  ) {}

  static create(input: EventCreatedInput): EventCreated {
    return new EventCreated(input.eventId, input.name, input.occurredAt);
  }

  get aggregateId(): Uuid {
    return this.eventId;
  }
}
