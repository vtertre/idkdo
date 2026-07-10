import { describe, expect, it } from "vitest";

import { eventWishSchema } from "./event-wish-schema.js";

const eventWish = {
  content: "Nintendo Switch\nhttps://example.com/item",
  createdAt: "2026-07-08T10:00:00.000Z",
  eventId: "550e8400-e29b-41d4-a716-446655440000",
  id: "660e8400-e29b-41d4-a716-446655440000",
  purchaseCoordination: { kind: "visible", reservation: null },
  updatedAt: "2026-07-08T10:00:00.000Z",
  wisherId: "770e8400-e29b-41d4-a716-446655440000",
};

describe("eventWishSchema", () => {
  it("accepts the Event Wish response contract", () => {
    expect(eventWishSchema.parse(eventWish)).toEqual(eventWish);
  });

  it("rejects additional properties", () => {
    expect(() => eventWishSchema.parse({ ...eventWish, extra: true })).toThrow();
  });
});
