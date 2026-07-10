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
import { deleteWish } from "./delete-wish.js";
import { CannotModifyAnotherParticipantWishError } from "./errors/cannot-modify-another-participant-wish-error.js";

let template: PgliteTestDatabaseTemplate;

beforeAll(async () => {
  template = await createMigratedPgliteTemplate();
});

afterAll(async () => {
  await template.close();
});

describe("deleteWish", () => {
  it("allows a Participant to delete their own Wish", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await deleteWish(database.applicationDatabase, {
        actorParticipantId: aliceId,
        wishId,
      });

      await expect(readWishRows(database.db)).resolves.toHaveLength(0);
    } finally {
      await database.close();
    }
  });

});

describe("deleteWish Reservation cascade", () => {
  it("cascades through its Reservation and Contributors without deleting unrelated rows", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await database.db.insert(wishes).values({
        content: "Unrelated Wish",
        eventId,
        id: unrelatedWishId,
        wisherId: bobId,
      });
      await database.db.insert(reservations).values([
        { id: reservationId, wishId },
        { id: unrelatedReservationId, wishId: unrelatedWishId },
      ]);
      await database.db.insert(reservationContributors).values([
        {
          id: contributorId,
          participantId: bobId,
          reservationId,
        },
        {
          id: unrelatedContributorId,
          participantId: aliceId,
          reservationId: unrelatedReservationId,
        },
      ]);

      await deleteWish(database.applicationDatabase, {
        actorParticipantId: aliceId,
        wishId,
      });

      await expect(
        database.db.select().from(reservations),
      ).resolves.toMatchObject([{ id: unrelatedReservationId }]);
      await expect(
        database.db.select().from(reservationContributors),
      ).resolves.toMatchObject([{ id: unrelatedContributorId }]);
    } finally {
      await database.close();
    }
  });
});

describe("deleteWish permissions and state", () => {
  it("throws NotFoundError for an unknown Wish", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        deleteWish(database.applicationDatabase, {
          actorParticipantId: aliceId,
          wishId: unknownWishId,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(readWishRows(database.db)).resolves.toHaveLength(1);
    } finally {
      await database.close();
    }
  });

  it("throws NotFoundError for an unknown actor Participant", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        deleteWish(database.applicationDatabase, {
          actorParticipantId: unknownParticipantId,
          wishId,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(readWishRows(database.db)).resolves.toHaveLength(1);
    } finally {
      await database.close();
    }
  });

  it("throws NotFoundError for an actor in another Event", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        deleteWish(database.applicationDatabase, {
          actorParticipantId: malloryId,
          wishId,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(readWishRows(database.db)).resolves.toHaveLength(1);
    } finally {
      await database.close();
    }
  });

  it("prevents a same-Event Participant from deleting another Participant's Wish", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        deleteWish(database.applicationDatabase, {
          actorParticipantId: bobId,
          wishId,
        }),
      ).rejects.toBeInstanceOf(CannotModifyAnotherParticipantWishError);
      await expect(readWishRows(database.db)).resolves.toHaveLength(1);
    } finally {
      await database.close();
    }
  });

  it("throws NotFoundError when deleting an already-deleted Wish", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await deleteWish(database.applicationDatabase, {
        actorParticipantId: aliceId,
        wishId,
      });

      await expect(
        deleteWish(database.applicationDatabase, {
          actorParticipantId: aliceId,
          wishId,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
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
    {
      id: eventId,
      name: "Christmas 2026",
    },
    {
      id: otherEventId,
      name: "Birthday 2026",
    },
  ]);
  await db.insert(participants).values([
    {
      eventId,
      id: aliceId,
      name: "Alice",
    },
    {
      eventId,
      id: bobId,
      name: "Bob",
    },
    {
      eventId: otherEventId,
      id: malloryId,
      name: "Mallory",
    },
  ]);
  await db.insert(wishes).values({
    content: "Original content",
    eventId,
    id: wishId,
    wisherId: aliceId,
  });
}

async function readWishRows(
  db: PgliteDatabase,
): Promise<(typeof wishes.$inferSelect)[]> {
  return db.select().from(wishes).where(eq(wishes.id, wishId));
}

const eventId = "00000000-0000-4000-8000-000000000001";
const otherEventId = "00000000-0000-4000-8000-000000000002";
const aliceId = "00000000-0000-4000-8000-000000000101";
const bobId = "00000000-0000-4000-8000-000000000102";
const malloryId = "00000000-0000-4000-8000-000000000201";
const unknownParticipantId = "00000000-0000-4000-8000-000000000999";
const wishId = "00000000-0000-4000-8000-000000000301";
const unknownWishId = "00000000-0000-4000-8000-000000000999";
const unrelatedWishId = "00000000-0000-4000-8000-000000000302";
const reservationId = "00000000-0000-4000-8000-000000000401";
const unrelatedReservationId = "00000000-0000-4000-8000-000000000402";
const contributorId = "00000000-0000-4000-8000-000000000501";
const unrelatedContributorId = "00000000-0000-4000-8000-000000000502";
