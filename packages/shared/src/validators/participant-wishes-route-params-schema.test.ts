import { describe, expect, it } from "vitest";

import { participantWishesRouteParamsSchema } from "./participant-wishes-route-params-schema.js";

describe("participantWishesRouteParamsSchema", () => {
  it("accepts a valid Participant id", () => {
    const params = {
      participantId: "550e8400-e29b-41d4-a716-446655440000",
    };

    expect(participantWishesRouteParamsSchema.parse(params)).toEqual(params);
  });

  it.each([
    ["missing participant id", {}],
    ["invalid uuid", { participantId: "not-a-uuid" }],
    [
      "extra property",
      {
        extra: true,
        participantId: "550e8400-e29b-41d4-a716-446655440000",
      },
    ],
  ])("rejects invalid route params: %s", (_caseName, params) => {
    expect(() => participantWishesRouteParamsSchema.parse(params)).toThrow();
  });
});
