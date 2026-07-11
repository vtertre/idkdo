import {
  events,
  participants,
  reservationContributors,
  reservations,
  wishes,
} from "@idkdo/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { NotFoundError } from "../../errors/not-found-error.js";
import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";
import { addContributor } from "./add-contributor.js";
import { CannotAddWisherAsContributorError } from "./errors/cannot-add-wisher-as-contributor-error.js";
import { ContributorAlreadyExistsError } from "./errors/contributor-already-exists-error.js";

let template: PgliteTestDatabaseTemplate;

beforeAll(async () => {
  template = await createMigratedPgliteTemplate();
});

afterAll(async () => {
  await template.close();
});

describe("addContributor", () => {
  it("allows a non-contributor actor to add a third Event member", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedReservation(database.db);

      const before = await loadReservationRow(database.db);
      const result = await addContributor(database.applicationDatabase, {
        actorParticipantId: carolId,
        participantId: daveId,
        reservationId,
      });
      const after = await loadReservationRow(database.db);

      expect(result.contributors.map((contributor) => contributor.participantId))
        .toEqual([bobId, daveId]);
      expect(after.updatedAt.getTime()).toBeGreaterThan(
        before.updatedAt.getTime(),
      );
    } finally {
      await database.close();
    }
  });

  it("allows an actor to join by adding themself", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedReservation(database.db);

      const result = await addContributor(database.applicationDatabase, {
        actorParticipantId: carolId,
        participantId: carolId,
        reservationId,
      });

      expect(result.contributors.map((contributor) => contributor.participantId))
        .toEqual([bobId, carolId]);
    } finally {
      await database.close();
    }
  });
});

describe("addContributor permissions and conflicts", () => {
  it.each([
    ["an unknown Reservation", unknownReservationId, bobId, carolId, NotFoundError],
    ["an unknown actor", reservationId, unknownParticipantId, carolId, NotFoundError],
    ["a foreign actor", reservationId, malloryId, carolId, NotFoundError],
    ["the Wisher as actor", reservationId, aliceId, carolId, NotFoundError],
    ["an unknown target", reservationId, bobId, unknownParticipantId, NotFoundError],
    ["a foreign target", reservationId, bobId, malloryId, NotFoundError],
    [
      "the Wisher as target",
      reservationId,
      bobId,
      aliceId,
      CannotAddWisherAsContributorError,
    ],
    [
      "an existing Contributor",
      reservationId,
      carolId,
      bobId,
      ContributorAlreadyExistsError,
    ],
  ])(
    "throws the expected error for %s",
    async (_name, targetReservationId, actorId, targetId, errorType) => {
      const database = await template.clone();

      try {
        await seedFixture(database.db);
        await seedReservation(database.db);

        await expect(
          addContributor(database.applicationDatabase, {
            actorParticipantId: actorId,
            participantId: targetId,
            reservationId: targetReservationId,
          }),
        ).rejects.toBeInstanceOf(errorType);
        await expect(
          database.db.select().from(reservationContributors),
        ).resolves.toHaveLength(1);
      } finally {
        await database.close();
      }
    },
  );

  it("leaves rows unchanged when the target already contributes", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedReservation(database.db);

      await expect(
        addContributor(database.applicationDatabase, {
          actorParticipantId: carolId,
          participantId: bobId,
          reservationId,
        }),
      ).rejects.toBeInstanceOf(ContributorAlreadyExistsError);
      await expect(
        database.db.select().from(reservationContributors),
      ).resolves.toHaveLength(1);
    } finally {
      await database.close();
    }
  });

  it("keeps the database unique constraint as the duplicate pair backstop", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedReservation(database.db);

      await expect(
        database.db.insert(reservationContributors).values({
          id: otherContributorId,
          participantId: bobId,
          reservationId,
        }),
      ).rejects.toBeDefined();
      await expect(
        addContributor(database.applicationDatabase, {
          actorParticipantId: carolId,
          participantId: bobId,
          reservationId,
        }),
      ).rejects.toBeInstanceOf(ContributorAlreadyExistsError);
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

async function seedReservation(db: PgliteDatabase): Promise<void> {
  await db.insert(reservations).values({
    id: reservationId,
    updatedAt: oldDate,
    wishId,
  });
  await db.insert(reservationContributors).values({
    id: contributorId,
    participantId: bobId,
    reservationId,
  });
}

async function loadReservationRow(
  db: PgliteDatabase,
): Promise<typeof reservations.$inferSelect> {
  const rows = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, reservationId));
  const row = rows[0];

  if (!row) {
    throw new Error("Expected seeded reservation.");
  }

  return row;
}

const oldDate = new Date("2026-07-08T10:00:00.000Z");
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
const contributorId = "00000000-0000-4000-8000-000000000501";
const otherContributorId = "00000000-0000-4000-8000-000000000502";
