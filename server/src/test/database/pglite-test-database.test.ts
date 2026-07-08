import { events } from "@idkdo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "./pglite-test-database.js";

describe("createMigratedPgliteTemplate", () => {
  let template: PgliteTestDatabaseTemplate;

  beforeAll(async () => {
    template = await createMigratedPgliteTemplate();
  });

  afterAll(async () => {
    await template.close();
  });

  it("applies checked-in migrations and clones isolated application databases", async () => {
    const firstDatabase = await template.clone();
    const secondDatabase = await template.clone();

    try {
      await firstDatabase.applicationDatabase.insert(events).values({
        id: "00000000-0000-4000-8000-000000000001",
        name: "Christmas 2026",
      });

      const persistedEvents = await firstDatabase.db.select().from(events);
      const persistedEvent = persistedEvents[0];

      expect(persistedEvents).toHaveLength(1);
      expect(persistedEvent).toBeDefined();
      expect(persistedEvent!.id).toBe("00000000-0000-4000-8000-000000000001");
      expect(persistedEvent!.name).toBe("Christmas 2026");
      expect(persistedEvent!.createdAt).toBeInstanceOf(Date);
      expect(persistedEvent!.updatedAt).toBeInstanceOf(Date);

      await expect(secondDatabase.db.select().from(events)).resolves.toHaveLength(0);
    } finally {
      await Promise.all([firstDatabase.close(), secondDatabase.close()]);
    }
  });
});
