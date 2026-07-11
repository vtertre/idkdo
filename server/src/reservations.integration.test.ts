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
  createEventResponseSchema,
  createParticipantResponseSchema,
  createReservationResponseSchema,
  createWishResponseSchema,
  getEventWishesResponseSchema,
  participantIdHeaderName,
  type CreateEventResponse,
  type CreateParticipantResponse,
  type CreateReservationResponse,
  type CreateWishResponse,
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
} from "vitest";

import { buildApp } from "./app.js";
import type { ServerEnvironment } from "./configuration/environment.js";

describe("Reservations integration anti-spoil matrix", () => {
  const context = new ReservationsIntegrationContext();

  beforeAll(() => context.start(), 120_000);
  beforeEach(() => context.resetDatabase());
  afterEach(() => context.closeApp());
  afterAll(() => context.stop(), 120_000);

  it("creates, exposes, conflicts, hides, validates, and cascades a Reservation", async () => {
    const app = context.openApp();
    const fixture = await createFixture(app);
    const reservation = await createAndAssertReservation(
      app,
      context,
      fixture,
    );

    await assertVisibleReservationAndConflict(app, fixture, reservation);
    await assertWisherCannotDetectReservation(app, fixture, reservation.id);
    await assertHiddenMembershipFailures(app, fixture);
    await deleteAndAssertCascade(app, context, fixture);
  });
});

type Fixture = {
  readonly alice: CreateParticipantResponse;
  readonly aliceReservedWish: CreateWishResponse;
  readonly aliceUnreservedWish: CreateWishResponse;
  readonly bob: CreateParticipantResponse;
  readonly carol: CreateParticipantResponse;
  readonly event: CreateEventResponse;
  readonly mallory: CreateParticipantResponse;
};

async function createAndAssertReservation(
  app: FastifyInstance,
  context: ReservationsIntegrationContext,
  fixture: Fixture,
): Promise<CreateReservationResponse> {
  const response = await app.inject({
    headers: { [participantIdHeaderName]: fixture.bob.id },
    method: "POST",
    url: `/api/wishes/${fixture.aliceReservedWish.id}/reservation`,
  });
  expect(response.statusCode).toBe(201);
  const reservation = createReservationResponseSchema.parse(
    parseBody(response.body),
  );
  expect(reservation).toMatchObject({
    contributors: [{ participantId: fixture.bob.id }],
    wishId: fixture.aliceReservedWish.id,
  });
  await expect(
    context.databaseClient.db.select().from(reservations),
  ).resolves.toHaveLength(1);
  await expect(
    context.databaseClient.db.select().from(reservationContributors),
  ).resolves.toMatchObject([
    { participantId: fixture.bob.id, reservationId: reservation.id },
  ]);
  return reservation;
}

async function assertVisibleReservationAndConflict(
  app: FastifyInstance,
  fixture: Fixture,
  reservation: CreateReservationResponse,
): Promise<void> {
  const viewResponse = await app.inject({
    headers: { [participantIdHeaderName]: fixture.carol.id },
    method: "GET",
    url: `/api/events/${fixture.event.id}/wishes`,
  });
  const view = getEventWishesResponseSchema.parse(parseBody(viewResponse.body));
  expect(
    view.wishes.find((wish) => wish.id === fixture.aliceReservedWish.id)
      ?.purchaseCoordination,
  ).toEqual({ kind: "visible", reservation });

  const conflictResponse = await app.inject({
    headers: { [participantIdHeaderName]: fixture.carol.id },
    method: "POST",
    url: `/api/wishes/${fixture.aliceReservedWish.id}/reservation`,
  });
  expect(conflictResponse.statusCode).toBe(409);
  expect(parseBody(conflictResponse.body)).toEqual({
    error: {
      code: "RESERVATION_ALREADY_EXISTS",
      message: "This wish is already reserved.",
    },
  });
}

async function assertWisherCannotDetectReservation(
  app: FastifyInstance,
  fixture: Fixture,
  reservationId: string,
): Promise<void> {
  const viewResponse = await app.inject({
    headers: { [participantIdHeaderName]: fixture.alice.id },
    method: "GET",
    url: `/api/events/${fixture.event.id}/wishes`,
  });
  const view = getEventWishesResponseSchema.parse(parseBody(viewResponse.body));
  const ownWish = view.wishes.find(
    (wish) => wish.id === fixture.aliceReservedWish.id,
  );
  expect(ownWish?.purchaseCoordination).toEqual({ kind: "hidden" });
  expect(JSON.stringify(ownWish)).not.toContain(reservationId);
  expect(JSON.stringify(ownWish)).not.toContain(fixture.bob.id);
  expect(viewResponse.body).not.toContain(reservationId);

  const reservedResponse = await reserveAsAlice(app, fixture.alice.id, fixture.aliceReservedWish.id);
  const unreservedResponse = await reserveAsAlice(app, fixture.alice.id, fixture.aliceUnreservedWish.id);
  expect(reservedResponse.statusCode).toBe(422);
  expect(unreservedResponse.statusCode).toBe(422);
  expect(reservedResponse.body).toBe(unreservedResponse.body);
  expect(parseBody(reservedResponse.body)).toEqual({
    error: {
      code: "CANNOT_RESERVE_OWN_WISH",
      message: "A participant cannot reserve their own wish.",
    },
  });
}

function reserveAsAlice(app: FastifyInstance, aliceId: string, wishId: string) {
  return app.inject({
    headers: { [participantIdHeaderName]: aliceId },
    method: "POST",
    url: `/api/wishes/${wishId}/reservation`,
  });
}

async function assertHiddenMembershipFailures(
  app: FastifyInstance,
  fixture: Fixture,
): Promise<void> {
  const foreignResponse = await app.inject({
    headers: { [participantIdHeaderName]: fixture.mallory.id },
    method: "POST",
    url: `/api/wishes/${fixture.aliceReservedWish.id}/reservation`,
  });
  const unknownWishResponse = await app.inject({
    headers: { [participantIdHeaderName]: fixture.bob.id },
    method: "POST",
    url: `/api/wishes/${unknownWishId}/reservation`,
  });
  const missingHeaderResponse = await app.inject({
    method: "POST",
    url: `/api/wishes/${fixture.aliceReservedWish.id}/reservation`,
  });
  expect(foreignResponse.statusCode).toBe(404);
  expect(unknownWishResponse.statusCode).toBe(404);
  expect(foreignResponse.body).toBe(unknownWishResponse.body);
  expect(missingHeaderResponse.statusCode).toBe(400);
}

async function deleteAndAssertCascade(
  app: FastifyInstance,
  context: ReservationsIntegrationContext,
  fixture: Fixture,
): Promise<void> {
  const response = await app.inject({
    headers: { [participantIdHeaderName]: fixture.alice.id },
    method: "DELETE",
    url: `/api/wishes/${fixture.aliceReservedWish.id}`,
  });
  expect(response.statusCode).toBe(204);
  await expect(
    context.databaseClient.db.select().from(reservations),
  ).resolves.toHaveLength(0);
  await expect(
    context.databaseClient.db.select().from(reservationContributors),
  ).resolves.toHaveLength(0);

  const viewResponse = await app.inject({
    headers: { [participantIdHeaderName]: fixture.bob.id },
    method: "GET",
    url: `/api/events/${fixture.event.id}/wishes`,
  });
  const view = getEventWishesResponseSchema.parse(parseBody(viewResponse.body));
  expect(
    view.wishes.some((wish) => wish.id === fixture.aliceReservedWish.id),
  ).toBe(false);
}

async function createFixture(app: FastifyInstance): Promise<Fixture> {
  const event = await createEvent(app, "Christmas 2026");
  const alice = await createParticipant(app, event.id, "Alice");
  const bob = await createParticipant(app, event.id, "Bob");
  const carol = await createParticipant(app, event.id, "Carol");
  const otherEvent = await createEvent(app, "Birthday 2026");
  const mallory = await createParticipant(app, otherEvent.id, "Mallory");
  const aliceReservedWish = await createWish(app, alice.id, "Livre");
  const aliceUnreservedWish = await createWish(app, alice.id, "Chocolat");

  return {
    alice,
    aliceReservedWish,
    aliceUnreservedWish,
    bob,
    carol,
    event,
    mallory,
  };
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

async function createWish(
  app: FastifyInstance,
  participantId: string,
  content: string,
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

function parseBody(body: string): unknown {
  return JSON.parse(body) as unknown;
}

class ReservationsIntegrationContext {
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

const unknownWishId = "00000000-0000-4000-8000-000000000999";
