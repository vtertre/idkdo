import { describe, expect, it } from "vitest";

import { reservationContributorSummarySchema } from "./reservation-contributor-summary-schema.js";

describe("reservationContributorSummarySchema", () => {
  it("accepts a contributor summary", () => {
    const summary = {
      createdAt: "2026-07-08T10:00:00.000Z",
      participantId: "00000000-0000-4000-8000-000000000101",
    };

    expect(reservationContributorSummarySchema.parse(summary)).toEqual(summary);
  });

  it("rejects extra keys", () => {
    expect(() =>
      reservationContributorSummarySchema.parse({
        createdAt: "2026-07-08T10:00:00.000Z",
        participantId: "00000000-0000-4000-8000-000000000101",
        name: "Alice",
      }),
    ).toThrow();
  });
});
