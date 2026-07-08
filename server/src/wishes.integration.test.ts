import {
  createDatabaseClient,
  events,
  migrateDatabase,
  participants,
  wishes,
  type DatabaseClient,
} from "@idkdo/db";
import {
  createParticipantResponseSchema,
  createEventResponseSchema,
  createWishResponseSchema,
  getParticipantWishesResponseSchema,
  participantIdHeaderName,
  type ApiErrorResponse,
  type CreateParticipantResponse,
  type CreateEventResponse,
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

describe("Wish create validation integration", () => {
  const context = useWishesIntegrationContext();

  it("returns 400 for missing or malformed Participant identity headers", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);

    const missingHeaderResponse = await app.inject({
      method: "POST",
      payload: { content: "Chocolat" },
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });
    const malformedHeaderResponse = await app.inject({
      headers: { [participantIdHeaderName]: "not-a-uuid" },
      method: "POST",
      payload: { content: "Chocolat" },
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });

    expect(missingHeaderResponse.statusCode).toBe(400);
    expect(parseBody(missingHeaderResponse.body)).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request headers.",
      },
    });
    expect(malformedHeaderResponse.statusCode).toBe(400);
    expect(parseBody(malformedHeaderResponse.body)).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request headers.",
      },
    });
  });

  it("returns 400 for blank Wish content without persisting anything", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);

    const response = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "POST",
      payload: { content: " \n " },
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });

    expect(response.statusCode).toBe(400);
    expect(parseBody(response.body)).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request body.",
      },
    });
    await expect(context.databaseClient.db.select().from(wishes)).resolves.toHaveLength(
      0,
    );
  });
});

describe("Wish permission integration", () => {
  const context = useWishesIntegrationContext();

  it("hides target and actor existence failures behind identical 404 bodies", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);

    const otherEventActorResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.mallory.id },
      method: "POST",
      payload: { content: "Chocolat" },
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });
    const unknownTargetResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "POST",
      payload: { content: "Chocolat" },
      url: `/api/participants/${unknownParticipantId}/wishes`,
    });
    const unknownActorResponse = await app.inject({
      headers: { [participantIdHeaderName]: unknownParticipantId },
      method: "POST",
      payload: { content: "Chocolat" },
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });
    const expectedBody: ApiErrorResponse = {
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      },
    };

    expect(otherEventActorResponse.statusCode).toBe(404);
    expect(unknownTargetResponse.statusCode).toBe(404);
    expect(unknownActorResponse.statusCode).toBe(404);
    expect(parseBody(otherEventActorResponse.body)).toEqual(expectedBody);
    expect(parseBody(unknownTargetResponse.body)).toEqual(expectedBody);
    expect(parseBody(unknownActorResponse.body)).toEqual(expectedBody);
    expect(otherEventActorResponse.body).toBe(unknownTargetResponse.body);
    expect(otherEventActorResponse.body).toBe(unknownActorResponse.body);
  });

  it("returns 422 when a same-Event Participant creates a Wish for someone else", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);

    const response = await app.inject({
      headers: { [participantIdHeaderName]: fixture.bob.id },
      method: "POST",
      payload: { content: "Chocolat" },
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });

    expect(response.statusCode).toBe(422);
    expect(parseBody(response.body)).toEqual({
      error: {
        code: "CANNOT_CREATE_WISH_FOR_ANOTHER_PARTICIPANT",
        message: "A participant can only create wishes for themselves.",
      },
    });
    await expect(context.databaseClient.db.select().from(wishes)).resolves.toHaveLength(
      0,
    );
  });

  it("returns 404 when reading another Event's Participant list", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);

    const response = await app.inject({
      headers: { [participantIdHeaderName]: fixture.mallory.id },
      method: "GET",
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });

    expect(response.statusCode).toBe(404);
    expect(parseBody(response.body)).toEqual({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      },
    });
  });
});

describe("Wish create and read integration", () => {
  const context = useWishesIntegrationContext();

  it("creates a Wish, persists its Event id and content, and returns it on later reads", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);
    const content = "Chocolat\nhttps://example.com/x";

    const createResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "POST",
      payload: { content },
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });

    expect(createResponse.statusCode).toBe(201);

    const createBody = createWishResponseSchema.parse(
      parseBody(createResponse.body),
    );
    const wishRows = await context.databaseClient.db
      .select()
      .from(wishes)
      .where(eq(wishes.id, createBody.id));

    expect(createBody).toMatchObject({
      content,
      eventId: fixture.event.id,
      wisherId: fixture.alice.id,
    });
    expect(wishRows).toHaveLength(1);
    expect(wishRows[0]).toMatchObject({
      content,
      eventId: fixture.event.id,
      wisherId: fixture.alice.id,
    });

    const aliceGetResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "GET",
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });
    const bobGetResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.bob.id },
      method: "GET",
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });
    const laterGetResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "GET",
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });

    expect(aliceGetResponse.statusCode).toBe(200);
    expect(bobGetResponse.statusCode).toBe(200);
    expect(laterGetResponse.statusCode).toBe(200);
    expect(
      getParticipantWishesResponseSchema.parse(parseBody(aliceGetResponse.body)),
    ).toEqual({ wishes: [createBody] });
    expect(
      getParticipantWishesResponseSchema.parse(parseBody(bobGetResponse.body)),
    ).toEqual({ wishes: [createBody] });
    expect(
      getParticipantWishesResponseSchema.parse(parseBody(laterGetResponse.body)),
    ).toEqual({ wishes: [createBody] });
  });
});

function useWishesIntegrationContext(): WishesIntegrationContext {
  const context = new WishesIntegrationContext();

  beforeAll(() => context.start(), 120_000);
  beforeEach(() => context.resetDatabase());
  afterEach(() => context.closeApp());
  afterAll(() => context.stop(), 120_000);

  return context;
}

type ParticipantsFixture = {
  readonly alice: CreateParticipantResponse;
  readonly bob: CreateParticipantResponse;
  readonly event: CreateEventResponse;
  readonly mallory: CreateParticipantResponse;
  readonly otherEvent: CreateEventResponse;
};

async function createParticipantsFixture(
  app: FastifyInstance,
): Promise<ParticipantsFixture> {
  const event = await createEvent(app, "Christmas 2026");
  const alice = await createParticipant(app, event.id, "Alice");
  const bob = await createParticipant(app, event.id, "Bob");
  const otherEvent = await createEvent(app, "Birthday 2026");
  const mallory = await createParticipant(app, otherEvent.id, "Mallory");

  return { alice, bob, event, mallory, otherEvent };
}

async function createEvent(
  app: FastifyInstance,
  name: string,
): Promise<CreateEventResponse> {
  const response = await app.inject({
    method: "POST",
    payload: { name },
    url: "/api/events",
  });

  expect(response.statusCode).toBe(201);

  return createEventResponseSchema.parse(parseBody(response.body));
}

async function createParticipant(
  app: FastifyInstance,
  eventId: string,
  name: string,
): Promise<CreateParticipantResponse> {
  const response = await app.inject({
    method: "POST",
    payload: { name },
    url: `/api/events/${eventId}/participants`,
  });

  expect(response.statusCode).toBe(201);

  return createParticipantResponseSchema.parse(parseBody(response.body));
}

function parseBody(body: string): unknown {
  return JSON.parse(body) as unknown;
}

class WishesIntegrationContext {
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

const unknownParticipantId = "00000000-0000-4000-8000-000000000999";
