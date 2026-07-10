import { describe, expect, it } from "vitest";

import { getEventWishesResponseSchema } from "./get-event-wishes-response-schema.js";

const response = {
  wishes: [
    {
      content: "Nintendo Switch\nhttps://example.com/item",
      createdAt: "2026-07-08T10:00:00.000Z",
      eventId: "550e8400-e29b-41d4-a716-446655440000",
      id: "660e8400-e29b-41d4-a716-446655440000",
      purchaseCoordination: { kind: "hidden" },
      updatedAt: "2026-07-08T10:00:00.000Z",
      wisherId: "770e8400-e29b-41d4-a716-446655440000",
    },
  ],
};

describe("getEventWishesResponseSchema", () => {
  it("accepts the Event Wishes response contract", () => {
    expect(getEventWishesResponseSchema.parse(response)).toEqual(response);
  });

  it("rejects additional properties", () => {
    expect(() =>
      getEventWishesResponseSchema.parse({ ...response, extra: true }),
    ).toThrow();
  });
});
