import { describe, expect, it } from "vitest";

import { participantSummarySchema } from "./participant-summary-schema.js";

describe("participantSummarySchema", () => {
  it("accepts a valid Participant summary", () => {
    const summary = {
      createdAt: "2026-06-26T10:00:00.000Z",
      eventId: "550e8400-e29b-41d4-a716-446655440000",
      id: "660e8400-e29b-41d4-a716-446655440000",
      name: "  Alice  ",
      updatedAt: "2026-06-26T10:00:00.000Z",
    };

    expect(participantSummarySchema.parse(summary)).toEqual({
      ...summary,
      name: "Alice",
    });
  });

  it.each([
    ["missing id", { eventId: "550e8400-e29b-41d4-a716-446655440000", name: "Alice", createdAt: "2026-06-26T10:00:00.000Z", updatedAt: "2026-06-26T10:00:00.000Z" }],
    ["blank name", { id: "660e8400-e29b-41d4-a716-446655440000", eventId: "550e8400-e29b-41d4-a716-446655440000", name: "   ", createdAt: "2026-06-26T10:00:00.000Z", updatedAt: "2026-06-26T10:00:00.000Z" }],
    ["invalid event id", { id: "660e8400-e29b-41d4-a716-446655440000", eventId: "not-a-uuid", name: "Alice", createdAt: "2026-06-26T10:00:00.000Z", updatedAt: "2026-06-26T10:00:00.000Z" }],
    ["invalid timestamp", { id: "660e8400-e29b-41d4-a716-446655440000", eventId: "550e8400-e29b-41d4-a716-446655440000", name: "Alice", createdAt: "yesterday", updatedAt: "2026-06-26T10:00:00.000Z" }],
    ["extra property", { id: "660e8400-e29b-41d4-a716-446655440000", eventId: "550e8400-e29b-41d4-a716-446655440000", name: "Alice", createdAt: "2026-06-26T10:00:00.000Z", updatedAt: "2026-06-26T10:00:00.000Z", extra: true }],
  ])("rejects invalid Participant summaries: %s", (_caseName, summary) => {
    expect(() => participantSummarySchema.parse(summary)).toThrow();
  });
});
