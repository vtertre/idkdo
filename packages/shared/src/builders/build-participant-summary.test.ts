import { describe, expect, it } from "vitest";

import { buildParticipantSummary } from "./build-participant-summary.js";

describe("buildParticipantSummary", () => {
  it("builds the shared Participant summary response shape", () => {
    expect(
      buildParticipantSummary({
        createdAtEpochMilliseconds: Date.parse("2026-06-26T10:00:00.000Z"),
        eventId: "550e8400-e29b-41d4-a716-446655440000",
        id: "660e8400-e29b-41d4-a716-446655440000",
        name: "Alice",
        updatedAtEpochMilliseconds: Date.parse("2026-06-26T10:05:00.000Z"),
      }),
    ).toEqual({
      createdAt: "2026-06-26T10:00:00.000Z",
      eventId: "550e8400-e29b-41d4-a716-446655440000",
      id: "660e8400-e29b-41d4-a716-446655440000",
      name: "Alice",
      updatedAt: "2026-06-26T10:05:00.000Z",
    });
  });
});
