import { describe, expect, it } from "vitest";

import { purchaseCoordinationSchema } from "./purchase-coordination-schema.js";

describe("purchaseCoordinationSchema", () => {
  it.each([
    { kind: "hidden" },
    { kind: "visible", reservation: null },
  ])("accepts the $kind coordination branch", (coordination) => {
    expect(purchaseCoordinationSchema.parse(coordination)).toEqual(coordination);
  });

  it.each([
    { kind: "hidden", reservation: null },
    { kind: "visible" },
    { kind: "unknown" },
  ])("rejects an invalid coordination object: $kind", (coordination) => {
    expect(() => purchaseCoordinationSchema.parse(coordination)).toThrow();
  });
});
