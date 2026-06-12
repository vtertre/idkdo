import { Uuid } from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { EventCreated } from "../events/event-created.js";
import { EventName } from "../value-objects/event-name.js";
import { Event } from "./event.js";

describe("Event", () => {
  it("creates an Event with generated identity and an EventCreated domain event", () => {
    const [event, domainEvents] = Event.create({
      name: EventName.create("Christmas 2026"),
    });
    const eventCreated = domainEvents[0];

    expect(() => Uuid.parse(event.id.toString())).not.toThrow();
    expect(event.name.value).toBe("Christmas 2026");
    expect(event.updatedAt.equals(event.createdAt)).toBe(true);
    expect(domainEvents).toHaveLength(1);
    expect(eventCreated).toBeDefined();
    expect(eventCreated).toBeInstanceOf(EventCreated);

    expect(eventCreated.aggregateType).toBe("Event");
    expect(eventCreated.aggregateId.equals(event.id)).toBe(true);
    expect(eventCreated.eventId.equals(event.id)).toBe(true);
    expect(eventCreated.name.value).toBe("Christmas 2026");
    expect(eventCreated.occurredAt.equals(event.createdAt)).toBe(true);
    expect(() => Uuid.parse(eventCreated.domainEventId.toString())).not.toThrow();
  });

  it("rehydrates persisted Event state without emitting domain events", () => {
    const id = Uuid.parse("7f6b7a8a-cd75-4a55-9f35-efc4532d833a");
    const createdAt = Temporal.Instant.from("2026-06-11T12:00:00.000Z");
    const updatedAt = Temporal.Instant.from("2026-06-12T12:00:00.000Z");

    const event = Event.rehydrate({
      createdAt,
      id,
      name: EventName.create("Family Birthday"),
      updatedAt,
    });

    expect(event.id.equals(id)).toBe(true);
    expect(event.name.value).toBe("Family Birthday");
    expect(event.createdAt.equals(createdAt)).toBe(true);
    expect(event.updatedAt.equals(updatedAt)).toBe(true);
  });
});
