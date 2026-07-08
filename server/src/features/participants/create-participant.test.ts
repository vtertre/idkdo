import { events, participants } from "@idkdo/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";
import { createParticipant } from "./create-participant.js";
import { EventNotFoundError } from "./errors/event-not-found-error.js";
import { ParticipantNameAlreadyExistsError } from "./errors/participant-name-already-exists-error.js";

let template: PgliteTestDatabaseTemplate;

beforeAll(async () => {
  template = await createMigratedPgliteTemplate();
});

afterAll(async () => {
  await template.close();
});

describe("createParticipant", () => {
  it("creates and returns a Participant summary", async () => {
    const database = await template.clone();

    try {
      await seedEvent(database.db, "00000000-0000-4000-8000-000000000001");

      const result = await createParticipant(database.applicationDatabase, {
        eventId: "00000000-0000-4000-8000-000000000001",
        name: "Alice",
      });
      const participantRows = await database.db.select().from(participants);

      expect(result).toMatchObject({
        eventId: "00000000-0000-4000-8000-000000000001",
        name: "Alice",
      });
      expect(participantRows).toHaveLength(1);
      expect(participantRows[0]?.id).toBe(result.id);
      expect(participantRows[0]?.name).toBe("Alice");
    } finally {
      await database.close();
    }
  });

  it("throws EventNotFoundError for an unknown Event", async () => {
    const database = await template.clone();

    try {
      await expect(
        createParticipant(database.applicationDatabase, {
          eventId: "00000000-0000-4000-8000-000000000001",
          name: "Alice",
        }),
      ).rejects.toBeInstanceOf(EventNotFoundError);
    } finally {
      await database.close();
    }
  });

  it("throws ParticipantNameAlreadyExistsError for duplicate names in the same Event", async () => {
    const database = await template.clone();

    try {
      await seedEvent(database.db, "00000000-0000-4000-8000-000000000001");
      await createParticipant(database.applicationDatabase, {
        eventId: "00000000-0000-4000-8000-000000000001",
        name: "Alice",
      });

      await expect(
        createParticipant(database.applicationDatabase, {
          eventId: "00000000-0000-4000-8000-000000000001",
          name: "Alice",
        }),
      ).rejects.toBeInstanceOf(ParticipantNameAlreadyExistsError);

      await expect(database.db.select().from(participants)).resolves.toHaveLength(1);
    } finally {
      await database.close();
    }
  });

  it("allows the same Participant name in different Events", async () => {
    const database = await template.clone();

    try {
      await seedEvent(database.db, "00000000-0000-4000-8000-000000000001");
      await seedEvent(database.db, "00000000-0000-4000-8000-000000000002");

      await createParticipant(database.applicationDatabase, {
        eventId: "00000000-0000-4000-8000-000000000001",
        name: "Alice",
      });
      await createParticipant(database.applicationDatabase, {
        eventId: "00000000-0000-4000-8000-000000000002",
        name: "Alice",
      });

      await expect(database.db.select().from(participants)).resolves.toHaveLength(2);
    } finally {
      await database.close();
    }
  });

  it("bumps the Event updated timestamp", async () => {
    const database = await template.clone();
    const originalUpdatedAt = new Date("2026-01-01T00:00:00.000Z");

    try {
      await database.db.insert(events).values({
        createdAt: originalUpdatedAt,
        id: "00000000-0000-4000-8000-000000000001",
        name: "Christmas 2026",
        updatedAt: originalUpdatedAt,
      });

      await createParticipant(database.applicationDatabase, {
        eventId: "00000000-0000-4000-8000-000000000001",
        name: "Alice",
      });

      const rows = await database.db
        .select()
        .from(events)
        .where(eq(events.id, "00000000-0000-4000-8000-000000000001"));

      expect(rows[0]?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
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
