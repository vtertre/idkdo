import { MissingAggregateRootError, Uuid } from "@idkdo/patterns";
import { describe, expect, it } from "vitest";

import { ParticipantNameAlreadyExistsError } from "../../domain/errors/participant-name-already-exists-error.js";
import { ParticipantName } from "../../domain/value-objects/participant-name.js";
import { EventName } from "../../domain/value-objects/event-name.js";
import { Event } from "../../domain/entities/event.js";
import { MemoryEventRepository } from "../../infrastructure/repositories/memory-event-repository.js";
import { CreateParticipantCommand } from "./create-participant-command.js";
import { CreateParticipantCommandHandler } from "./create-participant-command-handler.js";

describe("CreateParticipantCommandHandler", () => {
  it("creates and persists an Event-owned Participant", async () => {
    const eventRepository = new MemoryEventRepository();
    const handler = new CreateParticipantCommandHandler(eventRepository);
    const [event] = Event.create({
      name: EventName.create("Christmas 2026"),
    });
    await eventRepository.add(event);

    const [result, domainEvents] = await handler.execute(
      new CreateParticipantCommand(event.id, "  Alice  "),
    );
    const persistedEvent = await eventRepository.get(event.id);

    expect(result.eventId.equals(event.id)).toBe(true);
    expect(result.name.value).toBe("Alice");
    expect(persistedEvent?.participants).toHaveLength(1);
    expect(persistedEvent?.participants[0]?.name.value).toBe("Alice");
    expect(domainEvents).toHaveLength(1);
  });

  it("fails when the Event does not exist", async () => {
    const eventRepository = new MemoryEventRepository();
    const handler = new CreateParticipantCommandHandler(eventRepository);

    await expect(
      handler.execute(new CreateParticipantCommand(Uuid.random(), "Alice")),
    ).rejects.toThrow(MissingAggregateRootError);
  });

  it("fails when the Participant name already exists in the Event", async () => {
    const eventRepository = new MemoryEventRepository();
    const handler = new CreateParticipantCommandHandler(eventRepository);
    const [event] = Event.create({
      name: EventName.create("Christmas 2026"),
    });
    event.addParticipant({
      name: ParticipantName.create("Alice"),
    });
    await eventRepository.add(event);

    await expect(
      handler.execute(new CreateParticipantCommand(event.id, "Alice")),
    ).rejects.toThrow(ParticipantNameAlreadyExistsError);
  });
});
