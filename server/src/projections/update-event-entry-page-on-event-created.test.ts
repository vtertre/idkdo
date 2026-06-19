import { eventEntryPageProjection, type Database } from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { EventCreated } from "../domain/events/event-created.js";
import { EventName } from "../domain/value-objects/event-name.js";
import { UpdateEventEntryPageOnEventCreated } from "./update-event-entry-page-on-event-created.js";

describe("UpdateEventEntryPageOnEventCreated", () => {
  it("upserts an Event entry page projection row", async () => {
    const database = new RecordingProjectionDatabase();
    const occurredAt = Temporal.Instant.from("2026-06-19T10:00:00Z");
    const event = EventCreated.create({
      eventId: Uuid.random(),
      name: EventName.create("Christmas 2026"),
      occurredAt,
    });
    const handler = new UpdateEventEntryPageOnEventCreated(database.asDatabase());

    await handler.handle(event);

    expect(database.insertedTable).toBe(eventEntryPageProjection);
    expect(database.insertedValues).toEqual({
      createdAt: new Date(occurredAt.epochMilliseconds),
      id: event.eventId.toString(),
      name: "Christmas 2026",
      updatedAt: new Date(occurredAt.epochMilliseconds),
    });
    expect(database.conflictConfig).toMatchObject({
      set: {
        name: "Christmas 2026",
        updatedAt: new Date(occurredAt.epochMilliseconds),
      },
      target: eventEntryPageProjection.id,
    });
  });
});

class RecordingProjectionDatabase {
  conflictConfig: unknown;
  insertedTable: unknown;
  insertedValues: unknown;

  asDatabase(): Database {
    return {
      insert: (table: unknown) => {
        this.insertedTable = table;

        return {
          values: (values: unknown) => {
            this.insertedValues = values;

            return {
              onConflictDoUpdate: (config: unknown) => {
                this.conflictConfig = config;

                return Promise.resolve();
              },
            };
          },
        };
      },
    } as unknown as Database;
  }
}
