import { describe, expect, it } from "vitest";

import { getEventEntryPageResponseSchema } from "./get-event-entry-page-response-schema.js";

describe("getEventEntryPageResponseSchema", () => {
  it("accepts the Event entry page response contract", () => {
    const response = {
      createdAt: "2026-06-19T10:00:00.000Z",
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Christmas 2026",
      updatedAt: "2026-06-19T10:00:00.000Z",
    };

    expect(getEventEntryPageResponseSchema.parse(response)).toEqual(response);
  });

  it("rejects additional properties", () => {
    expect(() =>
      getEventEntryPageResponseSchema.parse({
        createdAt: "2026-06-19T10:00:00.000Z",
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Christmas 2026",
        participants: [],
        updatedAt: "2026-06-19T10:00:00.000Z",
      }),
    ).toThrow();
  });
});
