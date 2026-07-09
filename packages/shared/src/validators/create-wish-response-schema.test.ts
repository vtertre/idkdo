import { describe, expect, it } from "vitest";

import { createWishResponseSchema } from "./create-wish-response-schema.js";

describe("createWishResponseSchema", () => {
  it("accepts the Wish create response contract", () => {
    const response = {
      content: "Nintendo Switch\nhttps://example.com/item",
      createdAt: "2026-07-08T10:00:00.000Z",
      eventId: "550e8400-e29b-41d4-a716-446655440000",
      id: "660e8400-e29b-41d4-a716-446655440000",
      updatedAt: "2026-07-08T10:00:00.000Z",
      wisherId: "770e8400-e29b-41d4-a716-446655440000",
    };

    expect(createWishResponseSchema.parse(response)).toEqual(response);
  });
});
