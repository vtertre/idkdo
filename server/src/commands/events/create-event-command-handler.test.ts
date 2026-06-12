import { describe, expect, it } from "vitest";

import { EventCreated } from "../../domain/events/event-created.js";
import { MemoryEventRepository } from "../../infrastructure/repositories/memory-event-repository.js";
import { CreateEventCommand } from "./create-event-command.js";
import { CreateEventCommandHandler } from "./create-event-command-handler.js";

describe("CreateEventCommandHandler", () => {
  it("creates and persists an Event, returning the created id", async () => {
    const eventRepository = new MemoryEventRepository();
    const handler = new CreateEventCommandHandler(eventRepository);

    const [result, domainEvents] = await handler.execute(
      new CreateEventCommand("  Christmas 2026  "),
    );
    const persistedEvent = await eventRepository.get(result);

    expect(persistedEvent).toBeDefined();
    expect(persistedEvent?.id.equals(result)).toBe(true);
    expect(persistedEvent?.name.value).toBe("Christmas 2026");
    expect(domainEvents).toHaveLength(1);
    expect(domainEvents[0]).toBeInstanceOf(EventCreated);
  });
});
