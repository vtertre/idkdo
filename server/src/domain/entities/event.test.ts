import { Uuid } from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { EventCreated } from "../events/event-created.js";
import { ParticipantCreated } from "../events/participant-created.js";
import { ParticipantNameAlreadyExistsError } from "../errors/participant-name-already-exists-error.js";
import { EventName } from "../value-objects/event-name.js";
import { ParticipantName } from "../value-objects/participant-name.js";
import { Event } from "./event.js";
import { Participant } from "./participant.js";

describe("Event", () => {
  it("creates an Event with generated identity and an EventCreated domain event", () => {
    const [event, domainEvents] = Event.create({
      name: EventName.create("Christmas 2026"),
    });
    const eventCreated = domainEvents[0];

    expect(() => Uuid.parse(event.id.toString())).not.toThrow();
    expect(event.name.value).toBe("Christmas 2026");
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
    const id = Uuid.random();
    const createdAt = Temporal.Now.instant();
    const updatedAt = Temporal.Now.instant();

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

  it("adds a Participant within the Event boundary", () => {
    const [event] = Event.create({
      name: EventName.create("Christmas 2026"),
    });

    const [participant, domainEvents] = event.addParticipant({
      name: ParticipantName.create("Alice"),
    });

    expect(participant.eventId.equals(event.id)).toBe(true);
    expect(participant.name.value).toBe("Alice");
    expect(event.getParticipants()).toHaveLength(1);
    expect(event.getParticipants()[0]?.equals(participant)).toBe(true);
    expect(event.updatedAt.epochNanoseconds).toBeGreaterThanOrEqual(
      event.createdAt.epochNanoseconds,
    );
    expect(domainEvents).toHaveLength(1);
    expect(domainEvents[0]).toBeInstanceOf(ParticipantCreated);
    expect(domainEvents[0]?.aggregateType).toBe("Event");
  });

  it("rejects duplicate Participant names within the same Event", () => {
    const [event] = Event.create({
      name: EventName.create("Christmas 2026"),
    });

    event.addParticipant({
      name: ParticipantName.create("Alice"),
    });

    expect(() =>
      event.addParticipant({
        name: ParticipantName.create("Alice"),
      }),
    ).toThrow(ParticipantNameAlreadyExistsError);
  });

  it("rehydrates persisted Participants with the Event", () => {
    const createdAt = Temporal.Now.instant();
    const updatedAt = Temporal.Now.instant();
    const id = Uuid.random();
    const participant = Participant.rehydrate({
      createdAt,
      eventId: id,
      id: Uuid.random(),
      name: ParticipantName.create("Alice"),
      updatedAt,
    });
    const event = Event.rehydrate({
      createdAt,
      id,
      name: EventName.create("Family Birthday"),
      participants: [participant],
      updatedAt,
    });

    expect(event.getParticipants()).toHaveLength(1);
    expect(event.getParticipants()[0]?.equals(participant)).toBe(true);
  });
});
