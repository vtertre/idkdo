import { describe, expect, it } from "vitest";

import { purchaseCoordinationSchema } from "./purchase-coordination-schema.js";

const reservation = {
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

describe("purchaseCoordinationSchema", () => {
  it.each([
    { kind: "hidden" },
    { kind: "visible", reservation: null },
    { kind: "visible", reservation },
  ])("accepts the $kind coordination branch", (coordination) => {
    expect(purchaseCoordinationSchema.parse(coordination)).toEqual(coordination);
  });

  it.each([
    { kind: "hidden", reservation: null },
    { kind: "hidden", reservation },
    { kind: "visible" },
    { kind: "unknown" },
  ])("rejects an invalid coordination object: $kind", (coordination) => {
    expect(() => purchaseCoordinationSchema.parse(coordination)).toThrow();
  });
});
