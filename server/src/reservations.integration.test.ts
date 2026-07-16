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
  addContributorResponseSchema,
  createEventResponseSchema,
  createParticipantResponseSchema,
  createReservationResponseSchema,
  createWishResponseSchema,
  getEventWishesResponseSchema,
  participantIdHeaderName,
  removeContributorResponseSchema,
  type AddContributorResponse,
  type CreateEventResponse,
  type CreateParticipantResponse,
  type CreateReservationResponse,
  type CreateWishResponse,
  type RemoveContributorResponse,
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
import { removeContributor } from "./features/reservations/remove-contributor.js";

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

  it("runs the Contributor lifecycle over HTTP", async () => {
    const app = context.openApp();
    const fixture = await createFixture(app);
    const reservation = await createAndAssertReservation(
      app,
      context,
      fixture,
    );

    const joined = await addContributorRequest(app, {
      actorId: fixture.carol.id,
      participantId: fixture.carol.id,
      reservationId: reservation.id,
    });
    expect(joined.statusCode).toBe(200);
    const joinedReservation = addContributorResponseSchema.parse(
      parseBody(joined.body),
    );
    expect(contributorIds(joinedReservation)).toEqual([
      fixture.bob.id,
      fixture.carol.id,
    ]);

    const withDave = await addContributorRequest(app, {
      actorId: fixture.carol.id,
      participantId: fixture.dave.id,
      reservationId: reservation.id,
    });
    expect(withDave.statusCode).toBe(200);
    const daveReservation = addContributorResponseSchema.parse(
      parseBody(withDave.body),
    );
    expect(contributorIds(daveReservation)).toEqual([
      fixture.bob.id,
      fixture.carol.id,
      fixture.dave.id,
    ]);

    await assertContributorFailures(app, fixture, reservation.id);
    await assertContributorAntiSpoil(app, fixture, reservation.id);
    await assertContributorRemovals(app, context, fixture, reservation.id);
  });

  it("deletes the Reservation when the last two Contributors are removed concurrently", async () => {
    const app = context.openApp();
    const fixture = await createFixture(app);
    const reservation = await createAndAssertReservation(app, context, fixture);

    const joined = await addContributorRequest(app, {
      actorId: fixture.carol.id,
      participantId: fixture.carol.id,
      reservationId: reservation.id,
    });
    expect(joined.statusCode).toBe(200);

    const concurrentClient = createDatabaseClient({
      databaseUrl: context.databaseUrl(),
      maxConnections: 2,
    });

    try {
      const results = await Promise.all([
        removeContributor(concurrentClient.db, {
          actorParticipantId: fixture.bob.id,
          participantId: fixture.bob.id,
          reservationId: reservation.id,
        }),
        removeContributor(concurrentClient.db, {
          actorParticipantId: fixture.carol.id,
          participantId: fixture.carol.id,
          reservationId: reservation.id,
        }),
      ]);

      expect(results.filter((result) => result === null)).toHaveLength(1);
    } finally {
      await concurrentClient.close();
    }

    await expect(
      context.databaseClient.db.select().from(reservations),
    ).resolves.toEqual([]);
    await expect(
      context.databaseClient.db.select().from(reservationContributors),
    ).resolves.toEqual([]);
  });
});

type Fixture = {
  readonly alice: CreateParticipantResponse;
  readonly aliceReservedWish: CreateWishResponse;
  readonly aliceUnreservedWish: CreateWishResponse;
  readonly bob: CreateParticipantResponse;
  readonly carol: CreateParticipantResponse;
  readonly dave: CreateParticipantResponse;
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
  const dave = await createParticipant(app, event.id, "Dave");
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
    dave,
    event,
    mallory,
  };
}

async function assertContributorFailures(
  app: FastifyInstance,
  fixture: Fixture,
  reservationId: string,
): Promise<void> {
  const duplicateResponse = await addContributorRequest(app, {
    actorId: fixture.bob.id,
    participantId: fixture.carol.id,
    reservationId,
  });
  expect(duplicateResponse.statusCode).toBe(409);
  expect(parseBody(duplicateResponse.body)).toEqual({
    error: {
      code: "CONTRIBUTOR_ALREADY_EXISTS",
      message: "This participant already contributes to the reservation.",
    },
  });

  const wisherTargetResponse = await addContributorRequest(app, {
    actorId: fixture.bob.id,
    participantId: fixture.alice.id,
    reservationId,
  });
  expect(wisherTargetResponse.statusCode).toBe(422);
  expect(parseBody(wisherTargetResponse.body)).toEqual({
    error: {
      code: "CANNOT_ADD_WISHER_AS_CONTRIBUTOR",
      message: "The wisher cannot contribute to their own wish.",
    },
  });

  const malloryPostResponse = await addContributorRequest(app, {
    actorId: fixture.mallory.id,
    participantId: fixture.mallory.id,
    reservationId,
  });
  expect(malloryPostResponse.statusCode).toBe(404);

  const malloryDeleteResponse = await removeContributorRequest(app, {
    actorId: fixture.mallory.id,
    participantId: fixture.bob.id,
    reservationId,
  });
  expect(malloryDeleteResponse.statusCode).toBe(404);

  const missingHeaderResponse = await app.inject({
    method: "POST",
    payload: { participantId: fixture.carol.id },
    url: `/api/reservations/${reservationId}/contributors`,
  });
  expect(missingHeaderResponse.statusCode).toBe(400);
}

async function assertContributorAntiSpoil(
  app: FastifyInstance,
  fixture: Fixture,
  reservationId: string,
): Promise<void> {
  const unknownPostResponse = await addContributorRequest(app, {
    actorId: fixture.bob.id,
    participantId: fixture.bob.id,
    reservationId: unknownReservationId,
  });
  const alicePostResponse = await addContributorRequest(app, {
    actorId: fixture.alice.id,
    participantId: fixture.alice.id,
    reservationId,
  });
  expect(alicePostResponse.statusCode).toBe(404);
  expect(alicePostResponse.body).toBe(unknownPostResponse.body);

  const unknownDeleteResponse = await removeContributorRequest(app, {
    actorId: fixture.bob.id,
    participantId: fixture.bob.id,
    reservationId: unknownReservationId,
  });
  const aliceDeleteResponse = await removeContributorRequest(app, {
    actorId: fixture.alice.id,
    participantId: fixture.bob.id,
    reservationId,
  });
  expect(aliceDeleteResponse.statusCode).toBe(404);
  expect(aliceDeleteResponse.body).toBe(unknownDeleteResponse.body);

  const bobViewResponse = await app.inject({
    headers: { [participantIdHeaderName]: fixture.bob.id },
    method: "GET",
    url: `/api/events/${fixture.event.id}/wishes`,
  });
  const bobView = getEventWishesResponseSchema.parse(
    parseBody(bobViewResponse.body),
  );
  expect(
    bobView.wishes.find((wish) => wish.id === fixture.aliceReservedWish.id)
      ?.purchaseCoordination.kind,
  ).toBe("visible");

  const aliceViewResponse = await app.inject({
    headers: { [participantIdHeaderName]: fixture.alice.id },
    method: "GET",
    url: `/api/events/${fixture.event.id}/wishes`,
  });
  const aliceView = getEventWishesResponseSchema.parse(
    parseBody(aliceViewResponse.body),
  );
  const ownWish = aliceView.wishes.find(
    (wish) => wish.id === fixture.aliceReservedWish.id,
  );
  expect(ownWish?.purchaseCoordination).toEqual({ kind: "hidden" });
  expect(aliceViewResponse.body).not.toContain(reservationId);
  expect(aliceViewResponse.body).not.toContain(fixture.bob.id);
}

async function assertContributorRemovals(
  app: FastifyInstance,
  context: ReservationsIntegrationContext,
  fixture: Fixture,
  reservationId: string,
): Promise<void> {
  const removeDaveResponse = await removeContributorRequest(app, {
    actorId: fixture.bob.id,
    participantId: fixture.dave.id,
    reservationId,
  });
  expect(removeDaveResponse.statusCode).toBe(200);
  const withoutDave = removeContributorResponseSchema.parse(
    parseBody(removeDaveResponse.body),
  );
  expect(responseContributorIds(withoutDave)).toEqual([
    fixture.bob.id,
    fixture.carol.id,
  ]);

  const removeCarolResponse = await removeContributorRequest(app, {
    actorId: fixture.carol.id,
    participantId: fixture.carol.id,
    reservationId,
  });
  expect(removeCarolResponse.statusCode).toBe(200);
  expect(
    responseContributorIds(
      removeContributorResponseSchema.parse(parseBody(removeCarolResponse.body)),
    ),
  ).toEqual([fixture.bob.id]);

  const removeBobResponse = await removeContributorRequest(app, {
    actorId: fixture.bob.id,
    participantId: fixture.bob.id,
    reservationId,
  });
  expect(removeBobResponse.statusCode).toBe(200);
  expect(removeContributorResponseSchema.parse(parseBody(removeBobResponse.body)))
    .toEqual({ reservation: null });
  await expect(
    context.databaseClient.db.select().from(reservations),
  ).resolves.toHaveLength(0);
  await expect(
    context.databaseClient.db.select().from(reservationContributors),
  ).resolves.toHaveLength(0);

  const carolViewResponse = await app.inject({
    headers: { [participantIdHeaderName]: fixture.carol.id },
    method: "GET",
    url: `/api/events/${fixture.event.id}/wishes`,
  });
  const carolView = getEventWishesResponseSchema.parse(
    parseBody(carolViewResponse.body),
  );
  expect(
    carolView.wishes.find((wish) => wish.id === fixture.aliceReservedWish.id)
      ?.purchaseCoordination,
  ).toEqual({ kind: "visible", reservation: null });

  const deletedReservationResponse = await removeContributorRequest(app, {
    actorId: fixture.bob.id,
    participantId: fixture.bob.id,
    reservationId,
  });
  expect(deletedReservationResponse.statusCode).toBe(404);

  const reReserveResponse = await app.inject({
    headers: { [participantIdHeaderName]: fixture.carol.id },
    method: "POST",
    url: `/api/wishes/${fixture.aliceReservedWish.id}/reservation`,
  });
  expect(reReserveResponse.statusCode).toBe(201);
}

function addContributorRequest(
  app: FastifyInstance,
  input: {
    readonly actorId: string;
    readonly participantId: string;
    readonly reservationId: string;
  },
) {
  return app.inject({
    headers: { [participantIdHeaderName]: input.actorId },
    method: "POST",
    payload: { participantId: input.participantId },
    url: `/api/reservations/${input.reservationId}/contributors`,
  });
}

function removeContributorRequest(
  app: FastifyInstance,
  input: {
    readonly actorId: string;
    readonly participantId: string;
    readonly reservationId: string;
  },
) {
  return app.inject({
    headers: { [participantIdHeaderName]: input.actorId },
    method: "DELETE",
    url: `/api/reservations/${input.reservationId}/contributors/${input.participantId}`,
  });
}

function contributorIds(reservation: AddContributorResponse): readonly string[] {
  return reservation.contributors.map((contributor) => contributor.participantId);
}

function responseContributorIds(
  response: RemoveContributorResponse,
): readonly string[] {
  return response.reservation?.contributors.map(
    (contributor) => contributor.participantId,
  ) ?? [];
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

  databaseUrl(): string {
    return this.testEnvironment.databaseUrl;
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
const unknownReservationId = "00000000-0000-4000-8000-000000000998";
