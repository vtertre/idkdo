import { events } from "@idkdo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Event } from "../../domain/entities/event.js";
import { EventName } from "../../domain/value-objects/event-name.js";
import { DrizzleEventRepository } from "../../infrastructure/repositories/drizzle-event-repository.js";
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

  it("applies checked-in migrations and clones isolated databases that satisfy the repository contract", async () => {
    const firstDatabase = await template.clone();
    const secondDatabase = await template.clone();
    const firstRepository = new DrizzleEventRepository(
      firstDatabase.applicationDatabase,
    );
    const secondRepository = new DrizzleEventRepository(
      secondDatabase.applicationDatabase,
    );
    const [event] = Event.create({
      name: EventName.create("Christmas 2026"),
    });

    try {
      await firstRepository.add(event);

      const persistedEvents = await firstDatabase.db.select().from(events);
      const persistedEvent = persistedEvents[0];
      const foundEvent = await firstRepository.get(event.id);

      expect(persistedEvents).toHaveLength(1);
      expect(persistedEvent).toBeDefined();
      expect(persistedEvent!.id).toBe(event.id.toString());
      expect(persistedEvent!.name).toBe("Christmas 2026");
      expect(persistedEvent!.createdAt).toBeInstanceOf(Date);
      expect(persistedEvent!.updatedAt).toBeInstanceOf(Date);
      expect(foundEvent?.id.equals(event.id)).toBe(true);
      expect(foundEvent?.name.value).toBe("Christmas 2026");

      await expect(secondRepository.get(event.id)).resolves.toBeNull();
      await expect(secondDatabase.db.select().from(events)).resolves.toHaveLength(0);
    } finally {
      await Promise.all([firstDatabase.close(), secondDatabase.close()]);
    }
  });
});
