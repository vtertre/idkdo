import { eventEntryPageProjection } from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { EventCreated } from "../domain/events/event-created.js";
import { EventName } from "../domain/value-objects/event-name.js";
import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../test/database/pglite-test-database.js";
import { UpdateEventEntryPageOnEventCreated } from "./update-event-entry-page-on-event-created.js";

describe("UpdateEventEntryPageOnEventCreated", () => {
  let template: PgliteTestDatabaseTemplate;

  beforeAll(async () => {
    template = await createMigratedPgliteTemplate();
  });

  afterAll(async () => {
    await template.close();
  });

  it("upserts an Event entry page projection row", async () => {
    const occurredAt = Temporal.Instant.from("2026-06-19T10:00:00Z");
    const eventId = Uuid.random();
    const database = await template.clone();
    const handler = new UpdateEventEntryPageOnEventCreated(
      database.applicationDatabase,
    );

    const firstEvent = EventCreated.create({
      eventId,
      name: EventName.create("Christmas 2026"),
      occurredAt,
    });
    const secondOccurredAt = Temporal.Instant.from("2026-06-20T10:00:00Z");
    const secondEvent = EventCreated.create({
      eventId,
      name: EventName.create("Family Birthday"),
      occurredAt: secondOccurredAt,
    });

    try {
      await handler.handle(firstEvent);
      await handler.handle(secondEvent);

      const rows = await database.db
        .select()
        .from(eventEntryPageProjection)
        .where(eq(eventEntryPageProjection.id, eventId.toString()));
      const row = rows[0];

      expect(rows).toHaveLength(1);
      expect(row).toBeDefined();
      expect(row!.id).toBe(eventId.toString());
      expect(row!.name).toBe("Family Birthday");
      expect(row!.createdAt.toISOString()).toBe("2026-06-19T10:00:00.000Z");
      expect(row!.updatedAt.toISOString()).toBe("2026-06-20T10:00:00.000Z");
    } finally {
      await database.close();
    }
  });
});
