import { describe, expect, it } from "vitest";

import { getEventWishesRouteParamsSchema } from "./get-event-wishes-route-params-schema.js";

describe("getEventWishesRouteParamsSchema", () => {
  it("accepts a UUID Event id", () => {
    const params = { eventId: "550e8400-e29b-41d4-a716-446655440000" };

    expect(getEventWishesRouteParamsSchema.parse(params)).toEqual(params);
  });

  it("rejects an invalid Event id", () => {
    expect(() =>
      getEventWishesRouteParamsSchema.parse({ eventId: "not-a-uuid" }),
    ).toThrow();
  });
});
