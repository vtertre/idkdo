import { events } from "@idkdo/db";
import { createEventResponseSchema } from "@idkdo/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";
import { createEvent } from "./create-event.js";

describe("createEvent", () => {
  let template: PgliteTestDatabaseTemplate;

  beforeAll(async () => {
    template = await createMigratedPgliteTemplate();
  });

  afterAll(async () => {
    await template.close();
  });

  it("persists an Event and returns its UUID id", async () => {
    const database = await template.clone();

    try {
      const result = await createEvent(database.applicationDatabase, {
        name: "Christmas 2026",
      });
      const rows = await database.db.select().from(events);

      expect(() => createEventResponseSchema.parse(result)).not.toThrow();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: result.id,
        name: "Christmas 2026",
      });
      expect(rows[0]?.createdAt).toBeInstanceOf(Date);
      expect(rows[0]?.updatedAt).toBeInstanceOf(Date);
    } finally {
      await database.close();
    }
  });
});
