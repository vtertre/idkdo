import { eventEntryPageProjection } from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GetEventEntryPageQueryHandler } from "./get-event-entry-page-query-handler.js";
import { GetEventEntryPageQuery } from "./get-event-entry-page-query.js";
import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";

describe("GetEventEntryPageQueryHandler", () => {
  let template: PgliteTestDatabaseTemplate;

  beforeAll(async () => {
    template = await createMigratedPgliteTemplate();
  });

  afterAll(async () => {
    await template.close();
  });

  it("maps the requested Event entry page projection to the API response", async () => {
    const eventId = Uuid.random();
    const otherEventId = Uuid.random();
    const createdAt = new Date("2026-06-19T10:00:00.000Z");
    const database = await template.clone();
    const handler = new GetEventEntryPageQueryHandler(database.applicationDatabase);

    try {
      await database.db.insert(eventEntryPageProjection).values([
        {
          createdAt,
          id: otherEventId.toString(),
          name: "Family Birthday",
          updatedAt: createdAt,
        },
        {
          createdAt,
          id: eventId.toString(),
          name: "Christmas 2026",
          updatedAt: createdAt,
        },
      ]);

      await expect(
        handler.execute(new GetEventEntryPageQuery(eventId)),
      ).resolves.toEqual({
        createdAt: createdAt.toISOString(),
        id: eventId.toString(),
        name: "Christmas 2026",
        updatedAt: createdAt.toISOString(),
      });
    } finally {
      await database.close();
    }
  });

  it("returns null when the Event entry page projection does not exist", async () => {
    const eventId = Uuid.random();
    const database = await template.clone();
    const handler = new GetEventEntryPageQueryHandler(database.applicationDatabase);

    try {
      await expect(
        handler.execute(new GetEventEntryPageQuery(eventId)),
      ).resolves.toBeNull();
    } finally {
      await database.close();
    }
  });
});
