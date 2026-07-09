import { events, participants, wishes } from "@idkdo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { NotFoundError } from "../../errors/not-found-error.js";
import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";
import { CannotCreateWishForAnotherParticipantError } from "./errors/cannot-create-wish-for-another-participant-error.js";
import { createWish } from "./create-wish.js";

let template: PgliteTestDatabaseTemplate;

beforeAll(async () => {
  template = await createMigratedPgliteTemplate();
});

afterAll(async () => {
  await template.close();
});

describe("createWish", () => {
  it("persists and returns a Wish summary for the acting Wisher", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      const result = await createWish(database.applicationDatabase, {
        actorParticipantId: aliceId,
        content: "Chocolat\nhttps://example.com/x",
        wisherId: aliceId,
      });
      const wishRows = await database.db.select().from(wishes);

      expect(result).toMatchObject({
        content: "Chocolat\nhttps://example.com/x",
        eventId,
        wisherId: aliceId,
      });
      expect(result.createdAt).toEqual(wishRows[0]?.createdAt.toISOString());
      expect(result.updatedAt).toEqual(wishRows[0]?.updatedAt.toISOString());
      expect(wishRows).toHaveLength(1);
      expect(wishRows[0]).toMatchObject({
        content: "Chocolat\nhttps://example.com/x",
        eventId,
        id: result.id,
        wisherId: aliceId,
      });
    } finally {
      await database.close();
    }
  });

  it("throws NotFoundError for an unknown target Participant", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        createWish(database.applicationDatabase, {
          actorParticipantId: aliceId,
          content: "Chocolat",
          wisherId: unknownParticipantId,
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
        createWish(database.applicationDatabase, {
          actorParticipantId: unknownParticipantId,
          content: "Chocolat",
          wisherId: aliceId,
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
        createWish(database.applicationDatabase, {
          actorParticipantId: malloryId,
          content: "Chocolat",
          wisherId: aliceId,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    } finally {
      await database.close();
    }
  });

  it("throws a business error and writes nothing for another same-Event Participant", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      await expect(
        createWish(database.applicationDatabase, {
          actorParticipantId: bobId,
          content: "Chocolat",
          wisherId: aliceId,
        }),
      ).rejects.toBeInstanceOf(CannotCreateWishForAnotherParticipantError);

      await expect(database.db.select().from(wishes)).resolves.toHaveLength(0);
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
}

const eventId = "00000000-0000-4000-8000-000000000001";
const otherEventId = "00000000-0000-4000-8000-000000000002";
const aliceId = "00000000-0000-4000-8000-000000000101";
const bobId = "00000000-0000-4000-8000-000000000102";
const malloryId = "00000000-0000-4000-8000-000000000201";
const unknownParticipantId = "00000000-0000-4000-8000-000000000999";
