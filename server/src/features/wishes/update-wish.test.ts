import { events, participants, wishes } from "@idkdo/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { NotFoundError } from "../../errors/not-found-error.js";
import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";
import { CannotModifyAnotherParticipantWishError } from "./errors/cannot-modify-another-participant-wish-error.js";
import { getParticipantWishes } from "./get-participant-wishes.js";
import { updateWish } from "./update-wish.js";

let template: PgliteTestDatabaseTemplate;

beforeAll(async () => {
  template = await createMigratedPgliteTemplate();
});

afterAll(async () => {
  await template.close();
});

describe("updateWish success", () => {
  it("allows a Participant to edit their own Wish", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      const result = await updateWish(database.applicationDatabase, {
        actorParticipantId: aliceId,
        content: "Updated content",
        wishId,
      });
      const rows = await database.db
        .select()
        .from(wishes)
        .where(eq(wishes.id, wishId));

      expect(rows).toHaveLength(1);
      expect(rows[0]?.content).toBe("Updated content");
      expect(rows[0]?.createdAt.toISOString()).toBe(createdAt.toISOString());
      expect(rows[0]?.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
      expect(result).toEqual({
        content: "Updated content",
        createdAt: createdAt.toISOString(),
        eventId,
        id: wishId,
        updatedAt: rows[0]?.updatedAt.toISOString(),
        wisherId: aliceId,
      });
    } finally {
      await database.close();
    }
  });

  it("makes a Participant's own Wish edit immediately readable", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      const updatedWish = await updateWish(database.applicationDatabase, {
        actorParticipantId: aliceId,
        content: "Updated content",
        wishId,
      });

      await expect(
        getParticipantWishes(database.applicationDatabase, {
          participantId: aliceId,
          viewerParticipantId: aliceId,
        }),
      ).resolves.toEqual({ wishes: [updatedWish] });
    } finally {
      await database.close();
    }
  });
});

describe("updateWish permissions", () => {
  it("throws NotFoundError for an unknown Wish", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        updateWish(database.applicationDatabase, {
          actorParticipantId: aliceId,
          content: "Updated content",
          wishId: unknownWishId,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    } finally {
      await database.close();
    }
  });

  it("throws NotFoundError for an unknown actor Participant", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        updateWish(database.applicationDatabase, {
          actorParticipantId: unknownParticipantId,
          content: "Updated content",
          wishId,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    } finally {
      await database.close();
    }
  });

  it("throws NotFoundError for an actor in another Event", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        updateWish(database.applicationDatabase, {
          actorParticipantId: malloryId,
          content: "Updated content",
          wishId,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    } finally {
      await database.close();
    }
  });

  it("prevents a same-Event Participant from editing another Participant's Wish", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        updateWish(database.applicationDatabase, {
          actorParticipantId: bobId,
          content: "Updated content",
          wishId,
        }),
      ).rejects.toBeInstanceOf(CannotModifyAnotherParticipantWishError);

      await expect(readWishContent(database.db)).resolves.toBe("Original content");
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
    createdAt,
    eventId,
    id: wishId,
    updatedAt: createdAt,
    wisherId: aliceId,
  });
}

async function readWishContent(db: PgliteDatabase): Promise<string | undefined> {
  const rows = await db.select().from(wishes).where(eq(wishes.id, wishId));

  return rows[0]?.content;
}

const eventId = "00000000-0000-4000-8000-000000000001";
const otherEventId = "00000000-0000-4000-8000-000000000002";
const aliceId = "00000000-0000-4000-8000-000000000101";
const bobId = "00000000-0000-4000-8000-000000000102";
const malloryId = "00000000-0000-4000-8000-000000000201";
const unknownParticipantId = "00000000-0000-4000-8000-000000000999";
const wishId = "00000000-0000-4000-8000-000000000301";
const unknownWishId = "00000000-0000-4000-8000-000000000999";
const createdAt = new Date("2026-07-08T10:00:00.000Z");
