import {
  createDatabaseClient,
  events,
  migrateDatabase,
  type DatabaseClient,
} from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { Event } from "../../domain/entities/event.js";
import { EventName } from "../../domain/value-objects/event-name.js";
import { DrizzleEventRepository } from "./drizzle-event-repository.js";

describe("DrizzleEventRepository", () => {
  let databaseClient: DatabaseClient;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
    databaseClient = createDatabaseClient({
      databaseUrl: postgresContainer.getConnectionUri(),
      maxConnections: 1,
    });

    await migrateDatabase(databaseClient.db);
  }, 120_000);

  beforeEach(async () => {
    await databaseClient.db.delete(events);
  });

  afterAll(async () => {
    await databaseClient.close();
    await postgresContainer.stop();
  }, 120_000);

  it("adds and gets an Event", async () => {
    const repository = new DrizzleEventRepository(databaseClient.db);
    const [event] = Event.create({
      name: EventName.create("Christmas 2026"),
    });

    await repository.add(event);

    const persistedRows = await databaseClient.db
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
    const repository = new DrizzleEventRepository(databaseClient.db);

    await expect(repository.get(Uuid.random())).resolves.toBeNull();
  });

  it("updates an Event", async () => {
    const repository = new DrizzleEventRepository(databaseClient.db);
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

  it("checks whether an Event exists", async () => {
    const repository = new DrizzleEventRepository(databaseClient.db);
    const [event] = Event.create({
      name: EventName.create("Christmas 2026"),
    });

    await repository.add(event);

    await expect(repository.exists(event.id)).resolves.toBe(true);
    await expect(repository.exists(Uuid.random())).resolves.toBe(false);
  });
});
