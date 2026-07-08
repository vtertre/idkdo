import { events, participants, wishes } from "@idkdo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { NotFoundError } from "../../errors/not-found-error.js";
import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";
import { createWish } from "./create-wish.js";
import { getParticipantWishes } from "./get-participant-wishes.js";

let template: PgliteTestDatabaseTemplate;

beforeAll(async () => {
  template = await createMigratedPgliteTemplate();
});

afterAll(async () => {
  await template.close();
});

describe("getParticipantWishes reads", () => {
  it("returns own wishes ordered by createdAt and id", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedWish(database.db, {
        content: "Second by id",
        createdAt: sameCreatedAt,
        id: secondWishId,
      });
      await seedWish(database.db, {
        content: "First by date",
        createdAt: earlierCreatedAt,
        id: thirdWishId,
      });
      await seedWish(database.db, {
        content: "First by id",
        createdAt: sameCreatedAt,
        id: firstWishId,
      });

      const result = await getParticipantWishes(database.applicationDatabase, {
        participantId: aliceId,
        viewerParticipantId: aliceId,
      });

      expect(result.wishes.map((wish) => wish.content)).toEqual([
        "First by date",
        "First by id",
        "Second by id",
      ]);
    } finally {
      await database.close();
    }
  });

  it("allows another same-Event Participant to view the list", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      await seedWish(database.db, { content: "Chocolat", id: firstWishId });

      await expect(
        getParticipantWishes(database.applicationDatabase, {
          participantId: aliceId,
          viewerParticipantId: bobId,
        }),
      ).resolves.toMatchObject({
        wishes: [{ content: "Chocolat", eventId, wisherId: aliceId }],
      });
    } finally {
      await database.close();
    }
  });

  it("reads a Wish immediately after createWish returns", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);
      const createdWish = await createWish(database.applicationDatabase, {
        actorParticipantId: aliceId,
        content: "Chocolat\nhttps://example.com/x",
        wisherId: aliceId,
      });

      await expect(
        getParticipantWishes(database.applicationDatabase, {
          participantId: aliceId,
          viewerParticipantId: aliceId,
        }),
      ).resolves.toEqual({ wishes: [createdWish] });
    } finally {
      await database.close();
    }
  });
});

describe("getParticipantWishes permissions", () => {
  it("throws NotFoundError for a viewer from another Event", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        getParticipantWishes(database.applicationDatabase, {
          participantId: aliceId,
          viewerParticipantId: malloryId,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    } finally {
      await database.close();
    }
  });

  it("throws NotFoundError for an unknown target Participant", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        getParticipantWishes(database.applicationDatabase, {
          participantId: unknownParticipantId,
          viewerParticipantId: aliceId,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    } finally {
      await database.close();
    }
  });

  it("throws NotFoundError for an unknown viewer Participant", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        getParticipantWishes(database.applicationDatabase, {
          participantId: aliceId,
          viewerParticipantId: unknownParticipantId,
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

type SeedWishInput = {
  readonly content: string;
  readonly createdAt?: Date;
  readonly id: string;
};

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
}

async function seedWish(
  db: PgliteDatabase,
  input: SeedWishInput,
): Promise<void> {
  const wish: typeof wishes.$inferInsert = {
    content: input.content,
    eventId,
    id: input.id,
    wisherId: aliceId,
  };

  if (input.createdAt !== undefined) {
    wish.createdAt = input.createdAt;
    wish.updatedAt = input.createdAt;
  }

  await db.insert(wishes).values(wish);
}

const eventId = "00000000-0000-4000-8000-000000000001";
const otherEventId = "00000000-0000-4000-8000-000000000002";
const aliceId = "00000000-0000-4000-8000-000000000101";
const bobId = "00000000-0000-4000-8000-000000000102";
const malloryId = "00000000-0000-4000-8000-000000000201";
const unknownParticipantId = "00000000-0000-4000-8000-000000000999";
const firstWishId = "00000000-0000-4000-8000-000000000301";
const secondWishId = "00000000-0000-4000-8000-000000000302";
const thirdWishId = "00000000-0000-4000-8000-000000000303";
const earlierCreatedAt = new Date("2026-07-08T09:00:00.000Z");
const sameCreatedAt = new Date("2026-07-08T10:00:00.000Z");
