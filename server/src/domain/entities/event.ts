import { BaseAggregateRoot, Uuid } from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";

import { EventCreated } from "../events/event-created.js";
import type { EventName } from "../value-objects/event-name.js";

export type CreateEventInput = {
  readonly name: EventName;
};

export type RehydrateEventInput = {
  readonly createdAt: Temporal.Instant;
  readonly id: Uuid;
  readonly name: EventName;
  readonly updatedAt: Temporal.Instant;
};

export class Event extends BaseAggregateRoot<Uuid> {
  private constructor(
    id: Uuid,
    readonly name: EventName,
    readonly createdAt: Temporal.Instant,
    readonly updatedAt: Temporal.Instant,
  ) {
    super(id);
  }

  static create(input: CreateEventInput): [Event, [EventCreated]] {
    const id = Uuid.random();
    const now = Temporal.Now.instant();
    const event = new Event(id, input.name, now, now);
    const eventCreated = EventCreated.create({
      eventId: id,
      name: input.name,
      occurredAt: now,
    });

    return [event, [eventCreated]];
  }

  static rehydrate(input: RehydrateEventInput): Event {
    return new Event(input.id, input.name, input.createdAt, input.updatedAt);
  }
}
