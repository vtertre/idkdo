import {
  createDatabaseClient,
  eventEntryPageProjection,
  events,
  migrateDatabase,
} from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import {
  createEventResponseSchema,
  getEventEntryPageResponseSchema,
  healthResponseSchema,
} from "@idkdo/shared";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import type { FastifyInstance } from "fastify";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { eq } from "drizzle-orm";

import { buildApp } from "./app.js";
import type { ServerEnvironment } from "./configuration/environment.js";

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

  it("trims the Event name before persistence", async () => {
    const app = context.openApp();

    const response = await app.inject({
      method: "POST",
      payload: { name: "  Christmas 2026  " },
      url: "/api/events",
    });

    expect(response.statusCode).toBe(201);

    const responseBody = createEventResponseSchema.parse(
      JSON.parse(response.body) as unknown,
    );
    const persistedEvents = await context.databaseClient.db.select().from(events);

    expect(responseBody.id).toBe(persistedEvents[0]?.id);
    expect(persistedEvents[0]?.name).toBe("Christmas 2026");
  });

  it("rejects invalid Event create bodies without writing to the database", async () => {
    const app = context.openApp();

    const response = await app.inject({
      method: "POST",
      payload: { name: "   ", extra: true },
      url: "/api/events",
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request body.",
      },
    });

    const persistedEvents = await context.databaseClient.db.select().from(events);
    expect(persistedEvents).toHaveLength(0);
  });
});

describe("Event lookup integration", () => {
  const context = new EventsIntegrationContext();

  beforeAll(() => context.start(), 120_000);
  beforeEach(() => context.resetDatabase());
  afterEach(() => context.closeApp());
  afterAll(() => context.stop(), 120_000);

  it("returns an Event entry page read model by id", async () => {
    const app = context.openApp();
    const createResponse = await app.inject({
      method: "POST",
      payload: { name: "Christmas 2026" },
      url: "/api/events",
    });

    expect(createResponse.statusCode).toBe(201);

    const createResponseBody = createEventResponseSchema.parse(
      JSON.parse(createResponse.body) as unknown,
    );
    let projectionRow:
      | typeof eventEntryPageProjection.$inferSelect
      | undefined;

    await vi.waitFor(async () => {
      const rows = await context.databaseClient.db
        .select()
        .from(eventEntryPageProjection)
        .where(eq(eventEntryPageProjection.id, createResponseBody.id));

      projectionRow = rows[0];
      expect(rows).toHaveLength(1);
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/events/${createResponseBody.id}`,
    });

    expect(getResponse.statusCode).toBe(200);

    const getResponseBody = getEventEntryPageResponseSchema.parse(
      JSON.parse(getResponse.body) as unknown,
    );

    expect(getResponseBody).toEqual({
      id: createResponseBody.id,
      name: "Christmas 2026",
      createdAt: projectionRow!.createdAt.toISOString(),
      updatedAt: projectionRow!.updatedAt.toISOString(),
    });
  });

  it("returns 400 for an invalid Event id", async () => {
    const app = context.openApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/events/not-a-uuid",
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid route parameters.",
      },
    });
  });
});

describe("Health integration", () => {
  const context = new EventsIntegrationContext();

  beforeAll(() => context.start(), 120_000);
  beforeEach(() => context.resetDatabase());
  afterEach(() => context.closeApp());
  afterAll(() => context.stop(), 120_000);

  it("returns the shared health response contract", async () => {
    const app = context.openApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);
    expect(
      healthResponseSchema.parse(JSON.parse(response.body) as unknown),
    ).toEqual({
      service: "idkdo-api",
      status: "ok",
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
