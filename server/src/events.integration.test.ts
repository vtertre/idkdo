import {
  createDatabaseClient,
  eventEntryPageProjection,
  events,
  migrateDatabase,
} from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import { getEventEntryPageResponseSchema } from "@idkdo/shared";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { buildApp } from "./app.js";
import type { ServerEnvironment } from "./configuration/environment.js";

const createEventResponseSchema = z.object({
  id: z.string().uuid(),
});

describe("Events integration", () => {
  const context = new EventsIntegrationContext();

  beforeAll(() => context.start(), 120_000);
  beforeEach(() => context.resetDatabase());
  afterEach(() => context.closeApp());
  afterAll(() => context.stop(), 120_000);

  it("persists an Event and returns the created id", async () => {
    const app = context.openApp();

    const response = await app.inject({
      method: "POST",
      payload: { name: "Christmas 2026" },
      url: "/api/events",
    });

    expect(response.statusCode).toBe(201);

    const responseBody = createEventResponseSchema.parse(
      JSON.parse(response.body) as unknown,
    );
    const persistedEvents = await context.databaseClient.db.select().from(events);
    const persistedEvent = persistedEvents[0];

    expect(() => Uuid.parse(responseBody.id)).not.toThrow();
    expect(persistedEvents).toHaveLength(1);
    expect(persistedEvent).toBeDefined();

    expect(persistedEvent!.id).toBe(responseBody.id);
    expect(persistedEvent!.name).toBe("Christmas 2026");
    expect(persistedEvent!.createdAt).toBeInstanceOf(Date);
    expect(persistedEvent!.updatedAt).toBeInstanceOf(Date);
  });

  it("returns an Event entry page read model by id", async () => {
    const app = context.openApp();
    const eventId = Uuid.random().toString();
    const createdAt = new Date("2026-06-19T10:00:00.000Z");

    await context.databaseClient.db.insert(eventEntryPageProjection).values({
      createdAt,
      id: eventId,
      name: "Christmas 2026",
      updatedAt: createdAt,
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/events/${eventId}`,
    });

    expect(getResponse.statusCode).toBe(200);

    const getResponseBody = getEventEntryPageResponseSchema.parse(
      JSON.parse(getResponse.body) as unknown,
    );

    expect(getResponseBody).toEqual({
      createdAt: createdAt.toISOString(),
      id: eventId,
      name: "Christmas 2026",
      updatedAt: createdAt.toISOString(),
    });
  });

});

class EventsIntegrationContext {
  app: FastifyInstance | undefined;
  databaseClient!: ReturnType<typeof createDatabaseClient>;

  private postgresContainer!: StartedPostgreSqlContainer;
  private testEnvironment!: ServerEnvironment;

  async start(): Promise<void> {
    this.postgresContainer = await new PostgreSqlContainer(
      "postgres:17-alpine",
    ).start();
    this.testEnvironment = {
      databaseUrl: this.postgresContainer.getConnectionUri(),
      host: "127.0.0.1",
      logLevel: "silent",
      nodeEnv: "test",
      port: 3000,
    };
    this.databaseClient = createDatabaseClient({
      databaseUrl: this.testEnvironment.databaseUrl,
      maxConnections: 1,
    });

    await migrateDatabase(this.databaseClient.db);
  }

  async resetDatabase(): Promise<void> {
    await this.databaseClient.db.delete(eventEntryPageProjection);
    await this.databaseClient.db.delete(events);
  }

  openApp(): FastifyInstance {
    this.app = buildApp({
      databaseClient: this.databaseClient,
      environment: this.testEnvironment,
    });

    return this.app;
  }

  async closeApp(): Promise<void> {
    await this.app?.close();
    this.app = undefined;
  }

  async stop(): Promise<void> {
    await this.databaseClient.close();
    await this.postgresContainer.stop();
  }
}
