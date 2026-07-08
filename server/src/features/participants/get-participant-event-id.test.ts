import { events, participants } from "@idkdo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";
import { getParticipantEventId } from "./get-participant-event-id.js";

let template: PgliteTestDatabaseTemplate;

beforeAll(async () => {
  template = await createMigratedPgliteTemplate();
});

afterAll(async () => {
  await template.close();
});

describe("getParticipantEventId", () => {
  it("returns the Participant's Event id", async () => {
    const database = await template.clone();

    try {
      await seedEvent(database.db, eventId);
      await seedParticipant(database.db, aliceId, eventId, "Alice");

      await expect(
        getParticipantEventId(database.applicationDatabase, aliceId),
      ).resolves.toBe(eventId);
    } finally {
      await database.close();
    }
  });

  it("returns null for an unknown Participant id", async () => {
    const database = await template.clone();

    try {
      await expect(
        getParticipantEventId(database.applicationDatabase, aliceId),
      ).resolves.toBeNull();
    } finally {
      await database.close();
    }
  });
});

type PgliteDatabase = Awaited<
  ReturnType<PgliteTestDatabaseTemplate["clone"]>
>["db"];

async function seedEvent(db: PgliteDatabase, id: string): Promise<void> {
  await db.insert(events).values({
    id,
    name: "Christmas 2026",
  });
}

async function seedParticipant(
  db: PgliteDatabase,
  id: string,
  participantEventId: string,
  name: string,
): Promise<void> {
  await db.insert(participants).values({
    eventId: participantEventId,
    id,
    name,
  });
}

const eventId = "00000000-0000-4000-8000-000000000001";
const aliceId = "00000000-0000-4000-8000-000000000101";
