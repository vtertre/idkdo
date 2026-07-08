import { events, participants } from "@idkdo/db";
import { getEventEntryPageResponseSchema } from "@idkdo/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMigratedPgliteTemplate,
  type PgliteTestDatabaseTemplate,
} from "../../test/database/pglite-test-database.js";
import { getEventEntryPage } from "./get-event-entry-page.js";

describe("getEventEntryPage", () => {
  let template: PgliteTestDatabaseTemplate;

  beforeAll(async () => {
    template = await createMigratedPgliteTemplate();
  });

  afterAll(async () => {
    await template.close();
  });

  it("returns the shaped Event entry page with ordered Participants", async () => {
    const database = await template.clone();
    const eventCreatedAt = new Date("2026-01-01T00:00:00.000Z");
    const eventUpdatedAt = new Date("2026-01-02T00:00:00.000Z");
    const olderParticipantCreatedAt = new Date("2026-01-03T00:00:00.000Z");
    const newerParticipantCreatedAt = new Date("2026-01-04T00:00:00.000Z");

    try {
      await database.db.insert(events).values({
        createdAt: eventCreatedAt,
        id: "00000000-0000-4000-8000-000000000001",
        name: "Christmas 2026",
        updatedAt: eventUpdatedAt,
      });
      await database.db.insert(participants).values([
        {
          createdAt: newerParticipantCreatedAt,
          eventId: "00000000-0000-4000-8000-000000000001",
          id: "00000000-0000-4000-8000-000000000003",
          name: "Bob",
          updatedAt: newerParticipantCreatedAt,
        },
        {
          createdAt: olderParticipantCreatedAt,
          eventId: "00000000-0000-4000-8000-000000000001",
          id: "00000000-0000-4000-8000-000000000004",
          name: "Carol",
          updatedAt: olderParticipantCreatedAt,
        },
        {
          createdAt: olderParticipantCreatedAt,
          eventId: "00000000-0000-4000-8000-000000000001",
          id: "00000000-0000-4000-8000-000000000002",
          name: "Alice",
          updatedAt: olderParticipantCreatedAt,
        },
      ]);

      const result = await getEventEntryPage(database.applicationDatabase, {
        eventId: "00000000-0000-4000-8000-000000000001",
      });

      expect(getEventEntryPageResponseSchema.parse(result)).toEqual({
        createdAt: eventCreatedAt.toISOString(),
        id: "00000000-0000-4000-8000-000000000001",
        name: "Christmas 2026",
        participants: [
          {
            createdAt: olderParticipantCreatedAt.toISOString(),
            eventId: "00000000-0000-4000-8000-000000000001",
            id: "00000000-0000-4000-8000-000000000002",
            name: "Alice",
            updatedAt: olderParticipantCreatedAt.toISOString(),
          },
          {
            createdAt: olderParticipantCreatedAt.toISOString(),
            eventId: "00000000-0000-4000-8000-000000000001",
            id: "00000000-0000-4000-8000-000000000004",
            name: "Carol",
            updatedAt: olderParticipantCreatedAt.toISOString(),
          },
          {
            createdAt: newerParticipantCreatedAt.toISOString(),
            eventId: "00000000-0000-4000-8000-000000000001",
            id: "00000000-0000-4000-8000-000000000003",
            name: "Bob",
            updatedAt: newerParticipantCreatedAt.toISOString(),
          },
        ],
        updatedAt: eventUpdatedAt.toISOString(),
      });
    } finally {
      await database.close();
    }
  });

  it("returns null for an unknown Event", async () => {
    const database = await template.clone();

    try {
      await expect(
        getEventEntryPage(database.applicationDatabase, {
          eventId: "00000000-0000-4000-8000-000000000001",
        }),
      ).resolves.toBeNull();
    } finally {
      await database.close();
    }
  });
});
