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
import { removeContributor } from "./remove-contributor.js";

let template: PgliteTestDatabaseTemplate;

beforeAll(async () => {
  template = await createMigratedPgliteTemplate();
});

afterAll(async () => {
  await template.close();
});

describe("removeContributor", () => {
  it("removes one of two Contributors and returns the smaller summary", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedReservation(database.db, [bobId, carolId]);

      const result = await removeContributor(database.applicationDatabase, {
        actorParticipantId: daveId,
        participantId: carolId,
        reservationId,
      });

      expect(result?.contributors.map((contributor) => contributor.participantId))
        .toEqual([bobId]);
      await expect(
        database.db.select().from(reservationContributors),
      ).resolves.toHaveLength(1);
      await expect(database.db.select().from(reservations)).resolves.toHaveLength(
        1,
      );
    } finally {
      await database.close();
    }
  });

  it("allows self-removal", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedReservation(database.db, [bobId, carolId]);

      const result = await removeContributor(database.applicationDatabase, {
        actorParticipantId: carolId,
        participantId: carolId,
        reservationId,
      });

      expect(result?.contributors.map((contributor) => contributor.participantId))
        .toEqual([bobId]);
    } finally {
      await database.close();
    }
  });

  it("deletes the Reservation when removing the last Contributor", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedReservation(database.db, [bobId]);

      const result = await removeContributor(database.applicationDatabase, {
        actorParticipantId: carolId,
        participantId: bobId,
        reservationId,
      });

      expect(result).toBeNull();
      await expect(database.db.select().from(reservations)).resolves.toHaveLength(
        0,
      );
      await expect(
        database.db.select().from(reservationContributors),
      ).resolves.toHaveLength(0);
    } finally {
      await database.close();
    }
  });
});

describe("removeContributor permissions and not-found cases", () => {
  it.each([
    ["an unknown Reservation", unknownReservationId, bobId, bobId],
    ["an unknown actor", reservationId, unknownParticipantId, bobId],
    ["a foreign actor", reservationId, malloryId, bobId],
    ["the Wisher as actor", reservationId, aliceId, bobId],
    ["a non-Contributor target", reservationId, daveId, daveId],
  ])(
    "throws NotFoundError for %s",
    async (_name, targetReservationId, actorId, targetId) => {
      const database = await template.clone();

      try {
        await seedFixture(database.db);
        await seedReservation(database.db, [bobId, carolId]);

        await expect(
          removeContributor(database.applicationDatabase, {
            actorParticipantId: actorId,
            participantId: targetId,
            reservationId: targetReservationId,
          }),
        ).rejects.toBeInstanceOf(NotFoundError);
        await expect(database.db.select().from(reservations)).resolves.toHaveLength(
          1,
        );
        await expect(
          database.db.select().from(reservationContributors),
        ).resolves.toHaveLength(2);
      } finally {
        await database.close();
      }
    },
  );

  it("does not leave a zero-Contributor Reservation observable", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedReservation(database.db, [bobId]);

      await removeContributor(database.applicationDatabase, {
        actorParticipantId: carolId,
        participantId: bobId,
        reservationId,
      });

      await expect(database.db.select().from(reservations)).resolves.toHaveLength(
        0,
      );
      await expect(
        database.db.select().from(reservationContributors),
      ).resolves.toHaveLength(0);
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
    { eventId, id: daveId, name: "Dave" },
    { eventId: otherEventId, id: malloryId, name: "Mallory" },
  ]);
  await db.insert(wishes).values({
    content: "Livre",
    eventId,
    id: wishId,
    wisherId: aliceId,
  });
}

async function seedReservation(
  db: PgliteDatabase,
  contributorIds: readonly string[],
): Promise<void> {
  await db.insert(reservations).values({ id: reservationId, wishId });
  await db.insert(reservationContributors).values(
    contributorIds.map((participantId, index) => ({
      id: contributorIdsByIndex[index] ?? crypto.randomUUID(),
      participantId,
      reservationId,
    })),
  );
}

const eventId = "00000000-0000-4000-8000-000000000001";
const otherEventId = "00000000-0000-4000-8000-000000000002";
const aliceId = "00000000-0000-4000-8000-000000000101";
const bobId = "00000000-0000-4000-8000-000000000102";
const carolId = "00000000-0000-4000-8000-000000000103";
const daveId = "00000000-0000-4000-8000-000000000104";
const malloryId = "00000000-0000-4000-8000-000000000201";
const unknownParticipantId = "00000000-0000-4000-8000-000000000999";
const wishId = "00000000-0000-4000-8000-000000000301";
const reservationId = "00000000-0000-4000-8000-000000000401";
const unknownReservationId = "00000000-0000-4000-8000-000000000999";
const contributorIdsByIndex = [
  "00000000-0000-4000-8000-000000000501",
  "00000000-0000-4000-8000-000000000502",
];
