import { describe, expect, it } from "vitest";

import { updateWishResponseSchema } from "./update-wish-response-schema.js";
import { wishSummarySchema } from "./wish-summary-schema.js";

describe("updateWishResponseSchema", () => {
  it("uses the Wish summary response contract", () => {
    const response = {
      content: "Nintendo Switch\nhttps://example.com/item",
      createdAt: "2026-07-08T10:00:00.000Z",
      eventId: "550e8400-e29b-41d4-a716-446655440000",
      id: "660e8400-e29b-41d4-a716-446655440000",
      updatedAt: "2026-07-08T10:00:01.000Z",
      wisherId: "770e8400-e29b-41d4-a716-446655440000",
    };

    expect(updateWishResponseSchema).toBe(wishSummarySchema);
    expect(updateWishResponseSchema.parse(response)).toEqual(response);
  });
});
