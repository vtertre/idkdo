import { eventEntryPageProjection, type Database } from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import { describe, expect, it } from "vitest";

import { GetEventEntryPageQueryHandler } from "./get-event-entry-page-query-handler.js";
import { GetEventEntryPageQuery } from "./get-event-entry-page-query.js";

describe("GetEventEntryPageQueryHandler", () => {
  it("maps the Event entry page projection to the API response", async () => {
    const eventId = Uuid.random();
    const createdAt = new Date("2026-06-19T10:00:00.000Z");
    const database = new FakeQueryDatabase({
      createdAt,
      id: eventId.toString(),
      name: "Christmas 2026",
      updatedAt: createdAt,
    });
    const handler = new GetEventEntryPageQueryHandler(database.asDatabase());

    await expect(
      handler.execute(new GetEventEntryPageQuery(eventId)),
    ).resolves.toEqual({
      createdAt: createdAt.toISOString(),
      id: eventId.toString(),
      name: "Christmas 2026",
      updatedAt: createdAt.toISOString(),
    });
  });

  it("returns null when the Event entry page projection does not exist", async () => {
    const eventId = Uuid.random();
    const handler = new GetEventEntryPageQueryHandler(
      new FakeQueryDatabase(undefined).asDatabase(),
    );

    await expect(
      handler.execute(new GetEventEntryPageQuery(eventId)),
    ).resolves.toBeNull();
  });
});

type EventEntryPageProjectionRow = typeof eventEntryPageProjection.$inferSelect;

class FakeQueryDatabase {
  constructor(private readonly row: EventEntryPageProjectionRow | undefined) {}

  asDatabase(): Database {
    const rows = this.row ? [this.row] : [];

    return {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(rows),
          }),
        }),
      }),
    } as unknown as Database;
  }
}
