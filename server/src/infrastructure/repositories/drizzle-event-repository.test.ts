import {
  events,
  participants,
} from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { Event } from "../../domain/entities/event.js";
import { EventName } from "../../domain/value-objects/event-name.js";
import { ParticipantName } from "../../domain/value-objects/participant-name.js";
import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabase,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";
import { DrizzleEventRepository } from "./drizzle-event-repository.js";

describe("DrizzleEventRepository", () => {
  let database: PgliteTestDatabase | undefined;
  let template: PgliteTestDatabaseTemplate;

  beforeAll(async () => {
    template = await createMigratedPgliteTemplate();
  });

  beforeEach(async () => {
    await database?.close();
    database = await template.clone();
  });

  afterAll(async () => {
    await database?.close();
    await template.close();
  });

  it("adds and gets an Event", async () => {
    const repository = new DrizzleEventRepository(database!.applicationDatabase);
    const [event] = Event.create({
      name: EventName.create("Christmas 2026"),
    });

    await repository.add(event);

    const persistedRows = await database!.db
      .select()
      .from(events)
      .where(eq(events.id, event.id.toString()));
    const persistedRow = persistedRows[0];

    expect(persistedRows).toHaveLength(1);
    expect(persistedRow).toBeDefined();
    expect(persistedRow!.name).toBe("Christmas 2026");

    const foundEvent = await repository.get(event.id);

    expect(foundEvent).toBeDefined();
    expect(foundEvent!.id.equals(event.id)).toBe(true);
    expect(foundEvent!.name.value).toBe("Christmas 2026");
    expect(foundEvent!.createdAt.epochMilliseconds).toBe(
      event.createdAt.epochMilliseconds,
    );
    expect(foundEvent!.updatedAt.epochMilliseconds).toBe(
      event.updatedAt.epochMilliseconds,
    );
  });

  it("returns null when an Event does not exist", async () => {
    const repository = new DrizzleEventRepository(database!.applicationDatabase);

    await expect(repository.get(Uuid.random())).resolves.toBeNull();
  });

  it("updates an Event", async () => {
    const repository = new DrizzleEventRepository(database!.applicationDatabase);
    const [event] = Event.create({
      name: EventName.create("Christmas 2026"),
    });

    const updatedAt = Temporal.Instant.fromEpochMilliseconds(
      Temporal.Now.instant().epochMilliseconds,
    );
    const updatedEvent = Event.rehydrate({
      createdAt: event.createdAt,
      id: event.id,
      name: EventName.create("Family Birthday"),
      updatedAt,
    });

    await repository.add(event);
    await repository.update(updatedEvent);

    const foundEvent = await repository.get(event.id);

    expect(foundEvent).toBeDefined();
    expect(foundEvent!.name.value).toBe("Family Birthday");
    expect(foundEvent!.updatedAt.equals(updatedAt)).toBe(true);
  });

  it("persists Event-owned Participants during update", async () => {
    const repository = new DrizzleEventRepository(database!.applicationDatabase);
    const [event] = Event.create({
      name: EventName.create("Christmas 2026"),
    });

    await repository.add(event);
    const [eventWithParticipant] = event.addParticipant({
      name: ParticipantName.create("Alice"),
    });
    await repository.update(eventWithParticipant);

    const persistedParticipants = await database!.db
      .select()
      .from(participants)
      .where(eq(participants.eventId, event.id.toString()));
    const foundEvent = await repository.get(event.id);

    expect(persistedParticipants).toHaveLength(1);
    expect(persistedParticipants[0]?.name).toBe("Alice");
    expect(foundEvent?.participants).toHaveLength(1);
    expect(foundEvent?.participants[0]?.name.value).toBe("Alice");
  });

  it("checks whether an Event exists", async () => {
    const repository = new DrizzleEventRepository(database!.applicationDatabase);
    const [event] = Event.create({
      name: EventName.create("Christmas 2026"),
    });

    await repository.add(event);

    await expect(repository.exists(event.id)).resolves.toBe(true);
    await expect(repository.exists(Uuid.random())).resolves.toBe(false);
  });
});
