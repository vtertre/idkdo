import {
  createDatabaseClient,
  events,
  migrateDatabase,
  participants,
  reservationContributors,
  reservations,
  wishes,
  type DatabaseClient,
} from "@idkdo/db";
import {
  createParticipantResponseSchema,
  createEventResponseSchema,
  getEventEntryPageResponseSchema,
  healthResponseSchema,
} from "@idkdo/shared";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

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

    expect(responseBody.id).toMatch(uuidPattern);
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
    const eventRows = await context.databaseClient.db
      .select()
      .from(events)
      .where(eq(events.id, createResponseBody.id));
    const eventRow = eventRows[0];

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
      createdAt: eventRow!.createdAt.toISOString(),
      participants: [],
      updatedAt: eventRow!.updatedAt.toISOString(),
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

  it("returns 404 for an unknown Event id", async () => {
    const app = context.openApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/events/00000000-0000-4000-8000-000000000001",
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      error: {
        code: "EVENT_NOT_FOUND",
        message: "Event not found.",
      },
    });
  });
});

describe("Participant create integration", () => {
  const context = new EventsIntegrationContext();

  beforeAll(() => context.start(), 120_000);
  beforeEach(() => context.resetDatabase());
  afterEach(() => context.closeApp());
  afterAll(() => context.stop(), 120_000);

  it("creates a Participant for an Event and returns the shared response", async () => {
    const app = context.openApp();
    const createEventResponse = await app.inject({
      method: "POST",
      payload: { name: "Christmas 2026" },
      url: "/api/events",
    });
    const createEventBody = createEventResponseSchema.parse(
      JSON.parse(createEventResponse.body) as unknown,
    );

    const response = await app.inject({
      method: "POST",
      payload: { name: "  Alice  " },
      url: `/api/events/${createEventBody.id}/participants`,
    });

    expect(response.statusCode).toBe(201);

    const responseBody = createParticipantResponseSchema.parse(
      JSON.parse(response.body) as unknown,
    );
    const persistedParticipants = await context.databaseClient.db
      .select()
      .from(participants)
      .where(eq(participants.eventId, createEventBody.id));

    expect(responseBody.eventId).toBe(createEventBody.id);
    expect(responseBody.name).toBe("Alice");
    expect(persistedParticipants).toHaveLength(1);
    expect(persistedParticipants[0]?.name).toBe("Alice");
  });

  it("returns 404 when creating a Participant for an unknown Event", async () => {
    const app = context.openApp();

    const response = await app.inject({
      method: "POST",
      payload: { name: "Alice" },
      url: "/api/events/00000000-0000-4000-8000-000000000001/participants",
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      },
    });
  });

  it("returns 422 for duplicate Participant names in the same Event", async () => {
    const app = context.openApp();
    const createEventResponse = await app.inject({
      method: "POST",
      payload: { name: "Christmas 2026" },
      url: "/api/events",
    });
    const createEventBody = createEventResponseSchema.parse(
      JSON.parse(createEventResponse.body) as unknown,
    );

    await app.inject({
      method: "POST",
      payload: { name: "Alice" },
      url: `/api/events/${createEventBody.id}/participants`,
    });
    const response = await app.inject({
      method: "POST",
      payload: { name: "Alice" },
      url: `/api/events/${createEventBody.id}/participants`,
    });

    expect(response.statusCode).toBe(422);
    expect(JSON.parse(response.body)).toEqual({
      error: {
        code: "PARTICIPANT_NAME_ALREADY_EXISTS",
        message: "A participant with that name already exists for this event.",
      },
    });
  });
});

describe("Participant Event entry read model integration", () => {
  const context = new EventsIntegrationContext();

  beforeAll(() => context.start(), 120_000);
  beforeEach(() => context.resetDatabase());
  afterEach(() => context.closeApp());
  afterAll(() => context.stop(), 120_000);

  it("includes Participants in the Event entry read model", async () => {
    const app = context.openApp();
    const createEventResponse = await app.inject({
      method: "POST",
      payload: { name: "Christmas 2026" },
      url: "/api/events",
    });
    const createEventBody = createEventResponseSchema.parse(
      JSON.parse(createEventResponse.body) as unknown,
    );

    const createParticipantResponse = await app.inject({
      method: "POST",
      payload: { name: "Alice" },
      url: `/api/events/${createEventBody.id}/participants`,
    });
    const participantBody = createParticipantResponseSchema.parse(
      JSON.parse(createParticipantResponse.body) as unknown,
    );

    const eventRows = await context.databaseClient.db
      .select()
      .from(events)
      .where(eq(events.id, createEventBody.id));
    const eventRow = eventRows[0];

    const response = await app.inject({
      method: "GET",
      url: `/api/events/${createEventBody.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(
      getEventEntryPageResponseSchema.parse(JSON.parse(response.body) as unknown),
    ).toEqual({
      createdAt: eventRow!.createdAt.toISOString(),
      id: createEventBody.id,
      name: "Christmas 2026",
      participants: [
        {
          createdAt: participantBody.createdAt,
          eventId: createEventBody.id,
          id: participantBody.id,
          name: "Alice",
          updatedAt: participantBody.updatedAt,
        },
      ],
      updatedAt: eventRow!.updatedAt.toISOString(),
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
  databaseClient!: DatabaseClient;

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
    await this.databaseClient.db.delete(reservationContributors);
    await this.databaseClient.db.delete(reservations);
    await this.databaseClient.db.delete(wishes);
    await this.databaseClient.db.delete(participants);
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
    await this.databaseClient?.close();
    await this.postgresContainer?.stop();
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
