import { events, participants, wishes } from "@idkdo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { NotFoundError } from "../../errors/not-found-error.js";
import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";
import { getEventWishes } from "./get-event-wishes.js";

let template: PgliteTestDatabaseTemplate;

beforeAll(async () => {
  template = await createMigratedPgliteTemplate();
});

afterAll(async () => {
  await template.close();
});

describe("getEventWishes reads", () => {
  it("returns Event Wishes ordered by createdAt and id with Alice's coordination hidden", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      const result = await getEventWishes(database.applicationDatabase, {
        eventId,
        viewerParticipantId: aliceId,
      });

      expect(result.wishes.map((wish) => wish.content)).toEqual([
        "First by date",
        "First by id",
        "Second by id",
      ]);
      expect(result.wishes).toMatchObject([
        {
          purchaseCoordination: { kind: "visible", reservation: null },
          wisherId: bobId,
        },
        {
          purchaseCoordination: { kind: "hidden" },
          wisherId: aliceId,
        },
        {
          purchaseCoordination: { kind: "visible", reservation: null },
          wisherId: bobId,
        },
      ]);
    } finally {
      await database.close();
    }
  });

  it("flips coordination visibility for Bob's perspective", async () => {
    const database = await template.clone();

    try {
      await seedFixture(database.db);

      const result = await getEventWishes(database.applicationDatabase, {
        eventId,
        viewerParticipantId: bobId,
      });

      expect(result.wishes).toMatchObject([
        {
          purchaseCoordination: { kind: "hidden" },
          wisherId: bobId,
        },
        {
          purchaseCoordination: { kind: "visible", reservation: null },
          wisherId: aliceId,
        },
        {
          purchaseCoordination: { kind: "hidden" },
          wisherId: bobId,
        },
      ]);
    } finally {
      await database.close();
    }
  });

  it("returns an empty list for an Event with no Wishes", async () => {
    const database = await template.clone();

    try {
      await seedEventsAndParticipants(database.db);

      await expect(
        getEventWishes(database.applicationDatabase, {
          eventId,
          viewerParticipantId: aliceId,
        }),
      ).resolves.toEqual({ wishes: [] });
    } finally {
      await database.close();
    }
  });
});

describe("getEventWishes permissions", () => {
  it.each([
    ["a viewer from another Event", eventId, malloryId],
    ["an unknown viewer", eventId, unknownParticipantId],
    ["an Event the viewer does not belong to", otherEventId, aliceId],
    ["an unknown Event", unknownEventId, aliceId],
  ])("throws NotFoundError for %s", async (_caseName, targetEventId, viewerId) => {
    const database = await template.clone();

    try {
      await seedEventsAndParticipants(database.db);

      await expect(
        getEventWishes(database.applicationDatabase, {
          eventId: targetEventId,
          viewerParticipantId: viewerId,
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
  await seedEventsAndParticipants(db);
  await db.insert(wishes).values([
    {
      content: "Second by id",
      createdAt: sameCreatedAt,
      eventId,
      id: secondWishId,
      updatedAt: sameCreatedAt,
      wisherId: bobId,
    },
    {
      content: "First by date",
      createdAt: earlierCreatedAt,
      eventId,
      id: thirdWishId,
      updatedAt: earlierCreatedAt,
      wisherId: bobId,
    },
    {
      content: "First by id",
      createdAt: sameCreatedAt,
      eventId,
      id: firstWishId,
      updatedAt: sameCreatedAt,
      wisherId: aliceId,
    },
  ]);
}

async function seedEventsAndParticipants(db: PgliteDatabase): Promise<void> {
  await db.insert(events).values([
    { id: eventId, name: "Christmas 2026" },
    { id: otherEventId, name: "Birthday 2026" },
  ]);
  await db.insert(participants).values([
    { eventId, id: aliceId, name: "Alice" },
    { eventId, id: bobId, name: "Bob" },
    { eventId: otherEventId, id: malloryId, name: "Mallory" },
  ]);
}

const eventId = "00000000-0000-4000-8000-000000000001";
const otherEventId = "00000000-0000-4000-8000-000000000002";
const unknownEventId = "00000000-0000-4000-8000-000000000999";
const aliceId = "00000000-0000-4000-8000-000000000101";
const bobId = "00000000-0000-4000-8000-000000000102";
const malloryId = "00000000-0000-4000-8000-000000000201";
const unknownParticipantId = "00000000-0000-4000-8000-000000000998";
const firstWishId = "00000000-0000-4000-8000-000000000301";
const secondWishId = "00000000-0000-4000-8000-000000000302";
const thirdWishId = "00000000-0000-4000-8000-000000000303";
const earlierCreatedAt = new Date("2026-07-08T09:00:00.000Z");
const sameCreatedAt = new Date("2026-07-08T10:00:00.000Z");
