import { describe, expect, it } from "vitest";

import { canViewPurchaseCoordination } from "./can-view-purchase-coordination.js";

describe("canViewPurchaseCoordination", () => {
  it("allows a viewer to see coordination for another Participant's Wish", () => {
    expect(canViewPurchaseCoordination("viewer-id", "wisher-id")).toBe(true);
  });

  it("hides coordination from the Wisher", () => {
    expect(canViewPurchaseCoordination("wisher-id", "wisher-id")).toBe(false);
  });
});
