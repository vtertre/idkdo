import { eventEntryPageProjection } from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { ParticipantCreated } from "../domain/events/participant-created.js";
import { ParticipantName } from "../domain/value-objects/participant-name.js";
import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../test/database/pglite-test-database.js";
import { UpdateEventEntryPageOnParticipantCreated } from "./update-event-entry-page-on-participant-created.js";

describe("UpdateEventEntryPageOnParticipantCreated", () => {
  let template: PgliteTestDatabaseTemplate;

  beforeAll(async () => {
    template = await createMigratedPgliteTemplate();
  });

  afterAll(async () => {
    await template.close();
  });

  it("appends the Participant summary to the Event entry page projection", async () => {
    const eventId = Uuid.random();
    const participantId = Uuid.random();
    const occurredAt = Temporal.Instant.from("2026-06-26T10:00:00Z");
    const database = await template.clone();
    const handler = new UpdateEventEntryPageOnParticipantCreated(
      database.applicationDatabase,
    );

    try {
      await database.db.insert(eventEntryPageProjection).values({
        createdAt: new Date("2026-06-26T09:00:00.000Z"),
        id: eventId.toString(),
        name: "Christmas 2026",
        participants: [],
        updatedAt: new Date("2026-06-26T09:00:00.000Z"),
      });

      await handler.handle(
        ParticipantCreated.create({
          eventId,
          occurredAt,
          participantId,
          participantName: ParticipantName.create("Alice"),
        }),
      );

      const rows = await database.db
        .select()
        .from(eventEntryPageProjection)
        .where(eq(eventEntryPageProjection.id, eventId.toString()));
      const row = rows[0];

      expect(row).toBeDefined();
      const participant = row?.participants[0];

      expect(row?.participants).toHaveLength(1);
      expect(participant?.createdAt).toBe("2026-06-26T10:00:00.000Z");
      expect(participant?.eventId).toBe(eventId.toString());
      expect(participant?.id).toBe(participantId.toString());
      expect(participant?.name).toBe("Alice");
      expect(participant?.updatedAt).toBe("2026-06-26T10:00:00.000Z");
      expect(row?.updatedAt.toISOString()).toBe("2026-06-26T10:00:00.000Z");
    } finally {
      await database.close();
    }
  });
});
