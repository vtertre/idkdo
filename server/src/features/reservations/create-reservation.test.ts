import {
  events,
  participants,
  reservationContributors,
  reservations,
  wishes,
} from "@idkdo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { NotFoundError } from "../../errors/not-found-error.js";
import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";
import { createReservation } from "./create-reservation.js";
import { CannotReserveOwnWishError } from "./errors/cannot-reserve-own-wish-error.js";
import { ReservationAlreadyExistsError } from "./errors/reservation-already-exists-error.js";

let template: PgliteTestDatabaseTemplate;

beforeAll(async () => {
  template = await createMigratedPgliteTemplate();
});

afterAll(async () => {
  await template.close();
});

describe("createReservation", () => {
  it("persists a Reservation and its creator as the first Contributor", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      const result = await createReservation(database.applicationDatabase, {
        actorParticipantId: bobId,
        wishId,
      });
      const reservationRows = await database.db.select().from(reservations);
      const contributorRows = await database.db
        .select()
        .from(reservationContributors);

      expect(reservationRows).toHaveLength(1);
      expect(contributorRows).toHaveLength(1);
      expect(result).toEqual({
        contributors: [
          {
            createdAt: contributorRows[0]?.createdAt.toISOString(),
            participantId: bobId,
          },
        ],
        createdAt: reservationRows[0]?.createdAt.toISOString(),
        id: reservationRows[0]?.id,
        updatedAt: reservationRows[0]?.updatedAt.toISOString(),
        wishId,
      });
      expect(contributorRows[0]).toMatchObject({
        participantId: bobId,
        reservationId: result.id,
      });
    } finally {
      await database.close();
    }
  });
});

describe("createReservation permissions and conflicts", () => {
  it.each([
    ["an unknown Wish", unknownWishId, bobId],
    ["an unknown actor", wishId, unknownParticipantId],
    ["an actor from another Event", wishId, malloryId],
  ])("throws NotFoundError for %s", async (_name, targetWishId, actorId) => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        createReservation(database.applicationDatabase, {
          actorParticipantId: actorId,
          wishId: targetWishId,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(database.db.select().from(reservations)).resolves.toHaveLength(
        0,
      );
    } finally {
      await database.close();
    }
  });

  it("rejects the Wisher on their own unreserved Wish", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        createReservation(database.applicationDatabase, {
          actorParticipantId: aliceId,
          wishId,
        }),
      ).rejects.toBeInstanceOf(CannotReserveOwnWishError);
    } finally {
      await database.close();
    }
  });

  it("rejects the Wisher on their own reserved Wish before checking the conflict", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedReservation(database.db);

      await expect(
        createReservation(database.applicationDatabase, {
          actorParticipantId: aliceId,
          wishId,
        }),
      ).rejects.toBeInstanceOf(CannotReserveOwnWishError);
    } finally {
      await database.close();
    }
  });

  it("rejects a second non-Wisher without persisting another row", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedReservation(database.db);

      await expect(
        createReservation(database.applicationDatabase, {
          actorParticipantId: carolId,
          wishId,
        }),
      ).rejects.toBeInstanceOf(ReservationAlreadyExistsError);
      await expect(database.db.select().from(reservations)).resolves.toHaveLength(
        1,
      );
      await expect(
        database.db.select().from(reservationContributors),
      ).resolves.toHaveLength(1);
    } finally {
      await database.close();
    }
  });
});

describe("Reservation database constraints", () => {
  it("rejects duplicate Reservation wish ids", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await database.db.insert(reservations).values({ id: reservationId, wishId });

      await expect(
        database.db.insert(reservations).values({
          id: otherReservationId,
          wishId,
        }),
      ).rejects.toBeDefined();
    } finally {
      await database.close();
    }
  });

  it("rejects duplicate Reservation Contributor pairs", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await database.db.insert(reservations).values({ id: reservationId, wishId });
      await database.db.insert(reservationContributors).values({
        id: contributorId,
        participantId: bobId,
        reservationId,
      });

      await expect(
        database.db.insert(reservationContributors).values({
          id: otherContributorId,
          participantId: bobId,
          reservationId,
        }),
      ).rejects.toBeDefined();
    } finally {
      await database.close();
    }
  });
});

type PgliteDatabase = Awaited<
  ReturnType<PgliteTestDatabaseTemplate["clone"]>
>["db"];

async function seedFixture(db: PgliteDatabase): Promise<void> {
  await db.insert(events).values([
    { id: eventId, name: "Christmas 2026" },
    { id: otherEventId, name: "Birthday 2026" },
  ]);
  await db.insert(participants).values([
    { eventId, id: aliceId, name: "Alice" },
    { eventId, id: bobId, name: "Bob" },
    { eventId, id: carolId, name: "Carol" },
    { eventId: otherEventId, id: malloryId, name: "Mallory" },
  ]);
  await db.insert(wishes).values({
    content: "Livre",
    eventId,
    id: wishId,
    wisherId: aliceId,
  });
}

async function seedReservation(db: PgliteDatabase): Promise<void> {
  await db.insert(reservations).values({ id: reservationId, wishId });
  await db.insert(reservationContributors).values({
    id: contributorId,
    participantId: bobId,
    reservationId,
  });
}

const eventId = "00000000-0000-4000-8000-000000000001";
const otherEventId = "00000000-0000-4000-8000-000000000002";
const aliceId = "00000000-0000-4000-8000-000000000101";
const bobId = "00000000-0000-4000-8000-000000000102";
const carolId = "00000000-0000-4000-8000-000000000103";
const malloryId = "00000000-0000-4000-8000-000000000201";
const unknownParticipantId = "00000000-0000-4000-8000-000000000999";
const wishId = "00000000-0000-4000-8000-000000000301";
const unknownWishId = "00000000-0000-4000-8000-000000000999";
const reservationId = "00000000-0000-4000-8000-000000000401";
const otherReservationId = "00000000-0000-4000-8000-000000000402";
const contributorId = "00000000-0000-4000-8000-000000000501";
const otherContributorId = "00000000-0000-4000-8000-000000000502";
