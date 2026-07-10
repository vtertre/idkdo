import { describe, expect, it } from "vitest";

import { reservationSummarySchema } from "./reservation-summary-schema.js";

const summary = {
  contributors: [
    {
      createdAt: "2026-07-08T10:00:00.000Z",
      participantId: "00000000-0000-4000-8000-000000000101",
    },
  ],
  createdAt: "2026-07-08T10:00:00.000Z",
  id: "00000000-0000-4000-8000-000000000401",
  updatedAt: "2026-07-08T10:00:00.000Z",
  wishId: "00000000-0000-4000-8000-000000000301",
};

describe("reservationSummarySchema", () => {
  it("accepts a reservation summary", () => {
    expect(reservationSummarySchema.parse(summary)).toEqual(summary);
  });

  it("rejects an empty contributor list", () => {
    expect(() =>
      reservationSummarySchema.parse({ ...summary, contributors: [] }),
    ).toThrow();
  });

  it("rejects extra keys", () => {
    expect(() =>
      reservationSummarySchema.parse({ ...summary, note: "Surprise" }),
    ).toThrow();
  });
});
