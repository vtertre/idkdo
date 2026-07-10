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
  createWishResponseSchema,
  getEventWishesResponseSchema,
  getParticipantWishesResponseSchema,
  participantIdHeaderName,
  updateWishResponseSchema,
  type ApiErrorResponse,
  type CreateParticipantResponse,
  type CreateEventResponse,
  type CreateWishResponse,
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

describe("Event Wishes browsing integration", () => {
  const context = useWishesIntegrationContext();

  it("filters Purchase Coordination for Alice and Bob's perspectives", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);
    const aliceWish = await createWishForParticipant(
      app,
      fixture.alice.id,
      "Livre d'Alice",
    );
    const bobWish = await createWishForParticipant(
      app,
      fixture.bob.id,
      "Chocolat de Bob",
    );

    const aliceResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "GET",
      url: `/api/events/${fixture.event.id}/wishes`,
    });
    const bobResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.bob.id },
      method: "GET",
      url: `/api/events/${fixture.event.id}/wishes`,
    });

    expect(aliceResponse.statusCode).toBe(200);
    expect(bobResponse.statusCode).toBe(200);

    const aliceBody = getEventWishesResponseSchema.parse(
      parseBody(aliceResponse.body),
    );
    const bobBody = getEventWishesResponseSchema.parse(parseBody(bobResponse.body));

    expect(aliceBody.wishes).toEqual([
      { ...aliceWish, purchaseCoordination: { kind: "hidden" } },
      {
        ...bobWish,
        purchaseCoordination: { kind: "visible", reservation: null },
      },
    ]);
    expect(bobBody.wishes).toEqual([
      {
        ...aliceWish,
        purchaseCoordination: { kind: "visible", reservation: null },
      },
      { ...bobWish, purchaseCoordination: { kind: "hidden" } },
    ]);
    expectHiddenCoordinationToOmitReservation(aliceResponse.body);
    expectHiddenCoordinationToOmitReservation(bobResponse.body);
  });
});

describe("Event Wishes access integration", () => {
  const context = useWishesIntegrationContext();

  it("hides every membership failure behind byte-identical 404 bodies", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);

    const foreignViewerResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.mallory.id },
      method: "GET",
      url: `/api/events/${fixture.event.id}/wishes`,
    });
    const unknownViewerResponse = await app.inject({
      headers: { [participantIdHeaderName]: unknownParticipantId },
      method: "GET",
      url: `/api/events/${fixture.event.id}/wishes`,
    });
    const foreignEventResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "GET",
      url: `/api/events/${fixture.otherEvent.id}/wishes`,
    });
    const expectedBody: ApiErrorResponse = {
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      },
    };

    expect(foreignViewerResponse.statusCode).toBe(404);
    expect(unknownViewerResponse.statusCode).toBe(404);
    expect(foreignEventResponse.statusCode).toBe(404);
    expect(parseBody(foreignViewerResponse.body)).toEqual(expectedBody);
    expect(foreignViewerResponse.body).toBe(unknownViewerResponse.body);
    expect(foreignViewerResponse.body).toBe(foreignEventResponse.body);
  });

  it("validates Event Wishes headers and route parameters", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);

    const missingHeaderResponse = await app.inject({
      method: "GET",
      url: `/api/events/${fixture.event.id}/wishes`,
    });
    const malformedHeaderResponse = await app.inject({
      headers: { [participantIdHeaderName]: "not-a-uuid" },
      method: "GET",
      url: `/api/events/${fixture.event.id}/wishes`,
    });
    const malformedParamsResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "GET",
      url: "/api/events/not-a-uuid/wishes",
    });
    const expectedHeaderBody: ApiErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request headers.",
      },
    };

    expect(missingHeaderResponse.statusCode).toBe(400);
    expect(malformedHeaderResponse.statusCode).toBe(400);
    expect(parseBody(missingHeaderResponse.body)).toEqual(expectedHeaderBody);
    expect(parseBody(malformedHeaderResponse.body)).toEqual(expectedHeaderBody);
    expect(malformedParamsResponse.statusCode).toBe(400);
    expect(parseBody(malformedParamsResponse.body)).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid route parameters.",
      },
    });
  });
});

describe("Wish update success integration", () => {
  const context = useWishesIntegrationContext();

  it("allows a Participant to edit their own Wish", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);
    const createdWish = await createWishForParticipant(app, fixture.alice.id);
    const content = "Chocolat noir\nhttps://example.com/updated";

    const response = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "PATCH",
      payload: { content },
      url: `/api/wishes/${createdWish.id}`,
    });

    expect(response.statusCode).toBe(200);

    const body = updateWishResponseSchema.parse(parseBody(response.body));
    const wishRows = await context.databaseClient.db
      .select()
      .from(wishes)
      .where(eq(wishes.id, createdWish.id));

    expect(body).toMatchObject({
      content,
      createdAt: createdWish.createdAt,
      eventId: fixture.event.id,
      id: createdWish.id,
      wisherId: fixture.alice.id,
    });
    expect(body.updatedAt).not.toBe(createdWish.updatedAt);
    expect(wishRows[0]).toMatchObject({ content });

    const getResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "GET",
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });

    expect(getResponse.statusCode).toBe(200);
    expect(
      getParticipantWishesResponseSchema.parse(parseBody(getResponse.body)),
    ).toEqual({ wishes: [body] });
  });

});

describe("Wish update permission integration", () => {
  const context = useWishesIntegrationContext();

  it("prevents a same-Event Participant from editing another Participant's Wish", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);
    const createdWish = await createWishForParticipant(app, fixture.alice.id);

    const response = await app.inject({
      headers: { [participantIdHeaderName]: fixture.bob.id },
      method: "PATCH",
      payload: { content: "Bob edit" },
      url: `/api/wishes/${createdWish.id}`,
    });

    expect(response.statusCode).toBe(422);
    expect(parseBody(response.body)).toEqual({
      error: {
        code: "CANNOT_MODIFY_ANOTHER_PARTICIPANT_WISH",
        message: "A participant can only modify their own wishes.",
      },
    });
    await expect(readWishContent(context, createdWish.id)).resolves.toBe(
      createdWish.content,
    );
  });

  it("hides Wish and actor existence failures behind identical 404 bodies", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);
    const createdWish = await createWishForParticipant(app, fixture.alice.id);
    const expectedBody: ApiErrorResponse = {
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      },
    };

    const foreignActorResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.mallory.id },
      method: "PATCH",
      payload: { content: "Mallory edit" },
      url: `/api/wishes/${createdWish.id}`,
    });
    const unknownWishResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "PATCH",
      payload: { content: "Alice edit" },
      url: `/api/wishes/${unknownWishId}`,
    });
    const unknownActorResponse = await app.inject({
      headers: { [participantIdHeaderName]: unknownParticipantId },
      method: "PATCH",
      payload: { content: "Unknown edit" },
      url: `/api/wishes/${createdWish.id}`,
    });

    expect(foreignActorResponse.statusCode).toBe(404);
    expect(unknownWishResponse.statusCode).toBe(404);
    expect(unknownActorResponse.statusCode).toBe(404);
    expect(parseBody(foreignActorResponse.body)).toEqual(expectedBody);
    expect(parseBody(unknownWishResponse.body)).toEqual(expectedBody);
    expect(parseBody(unknownActorResponse.body)).toEqual(expectedBody);
    expect(foreignActorResponse.body).toBe(unknownWishResponse.body);
    expect(foreignActorResponse.body).toBe(unknownActorResponse.body);
  });

  it("returns 400 for blank content and leaves the Wish unchanged", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);
    const createdWish = await createWishForParticipant(app, fixture.alice.id);

    const response = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "PATCH",
      payload: { content: " \n " },
      url: `/api/wishes/${createdWish.id}`,
    });

    expect(response.statusCode).toBe(400);
    expect(parseBody(response.body)).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request body.",
      },
    });
    await expect(readWishContent(context, createdWish.id)).resolves.toBe(
      createdWish.content,
    );
  });

  it("returns 400 for missing headers", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);
    const createdWish = await createWishForParticipant(app, fixture.alice.id);

    const response = await app.inject({
      method: "PATCH",
      payload: { content: "Updated content" },
      url: `/api/wishes/${createdWish.id}`,
    });

    expect(response.statusCode).toBe(400);
    expect(parseBody(response.body)).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request headers.",
      },
    });
  });
});

describe("Wish delete integration", () => {
  const context = useWishesIntegrationContext();

  it("allows a Participant to delete their own Wish", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);
    const createdWish = await createWishForParticipant(app, fixture.alice.id);

    const response = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "DELETE",
      url: `/api/wishes/${createdWish.id}`,
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    await expect(readWishRows(context, createdWish.id)).resolves.toHaveLength(0);

    const getResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "GET",
      url: `/api/participants/${fixture.alice.id}/wishes`,
    });

    expect(getResponse.statusCode).toBe(200);
    expect(
      getParticipantWishesResponseSchema.parse(parseBody(getResponse.body)),
    ).toEqual({ wishes: [] });

    const repeatDeleteResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "DELETE",
      url: `/api/wishes/${createdWish.id}`,
    });
    const patchDeletedResponse = await app.inject({
      headers: { [participantIdHeaderName]: fixture.alice.id },
      method: "PATCH",
      payload: { content: "Updated after delete" },
      url: `/api/wishes/${createdWish.id}`,
    });

    expect(repeatDeleteResponse.statusCode).toBe(404);
    expect(patchDeletedResponse.statusCode).toBe(404);
  });

  it("prevents a same-Event Participant from deleting another Participant's Wish", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);
    const createdWish = await createWishForParticipant(app, fixture.alice.id);

    const response = await app.inject({
      headers: { [participantIdHeaderName]: fixture.bob.id },
      method: "DELETE",
      url: `/api/wishes/${createdWish.id}`,
    });

    expect(response.statusCode).toBe(422);
    expect(parseBody(response.body)).toEqual({
      error: {
        code: "CANNOT_MODIFY_ANOTHER_PARTICIPANT_WISH",
        message: "A participant can only modify their own wishes.",
      },
    });
    await expect(readWishRows(context, createdWish.id)).resolves.toHaveLength(1);
  });

  it("hides a foreign Event actor when deleting and preserves the Wish", async () => {
    const app = context.openApp();
    const fixture = await createParticipantsFixture(app);
    const createdWish = await createWishForParticipant(app, fixture.alice.id);

    const response = await app.inject({
      headers: { [participantIdHeaderName]: fixture.mallory.id },
      method: "DELETE",
      url: `/api/wishes/${createdWish.id}`,
    });

    expect(response.statusCode).toBe(404);
    expect(parseBody(response.body)).toEqual({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      },
    });
    await expect(readWishRows(context, createdWish.id)).resolves.toHaveLength(1);
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

async function createWishForParticipant(
  app: FastifyInstance,
  participantId: string,
  content = "Chocolat",
): Promise<CreateWishResponse> {
  const response = await app.inject({
    headers: { [participantIdHeaderName]: participantId },
    method: "POST",
    payload: { content },
    url: `/api/participants/${participantId}/wishes`,
  });

  expect(response.statusCode).toBe(201);

  return createWishResponseSchema.parse(parseBody(response.body));
}

function expectHiddenCoordinationToOmitReservation(body: string): void {
  const hiddenObjects =
    body.match(
      /"purchaseCoordination":\{(?=[^}]*"kind":"hidden")[^}]*\}/g,
    ) ?? [];

  expect(hiddenObjects.length).toBeGreaterThan(0);
  for (const hiddenObject of hiddenObjects) {
    expect(hiddenObject).not.toContain('"reservation"');
  }
}

async function readWishRows(
  context: WishesIntegrationContext,
  wishId: string,
): Promise<(typeof wishes.$inferSelect)[]> {
  return context.databaseClient.db
    .select()
    .from(wishes)
    .where(eq(wishes.id, wishId));
}

async function readWishContent(
  context: WishesIntegrationContext,
  wishId: string,
): Promise<string | undefined> {
  const rows = await readWishRows(context, wishId);

  return rows[0]?.content;
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

const unknownParticipantId = "00000000-0000-4000-8000-000000000999";
const unknownWishId = "00000000-0000-4000-8000-000000000998";
