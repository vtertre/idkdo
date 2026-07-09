import { describe, expect, it } from "vitest";

import { getParticipantWishesResponseSchema } from "./get-participant-wishes-response-schema.js";

describe("getParticipantWishesResponseSchema", () => {
  it("accepts the Participant Wishes response contract", () => {
    const response = {
      wishes: [
        {
          content: "Nintendo Switch\nhttps://example.com/item",
          createdAt: "2026-07-08T10:00:00.000Z",
          eventId: "550e8400-e29b-41d4-a716-446655440000",
          id: "660e8400-e29b-41d4-a716-446655440000",
          updatedAt: "2026-07-08T10:00:00.000Z",
          wisherId: "770e8400-e29b-41d4-a716-446655440000",
        },
      ],
    };

    expect(getParticipantWishesResponseSchema.parse(response)).toEqual(response);
  });

  it("rejects additional properties", () => {
    expect(() =>
      getParticipantWishesResponseSchema.parse({
        wishes: [],
        extra: true,
      }),
    ).toThrow();
  });
});
