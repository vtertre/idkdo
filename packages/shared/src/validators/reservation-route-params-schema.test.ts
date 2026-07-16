import { describe, expect, it } from "vitest";

import { reservationRouteParamsSchema } from "./reservation-route-params-schema.js";

describe("reservationRouteParamsSchema", () => {
  it("accepts a valid Reservation id", () => {
    const params = {
      reservationId: "550e8400-e29b-41d4-a716-446655440000",
    };

    expect(reservationRouteParamsSchema.parse(params)).toEqual(params);
  });

  it.each([
    ["missing reservation id", {}],
    ["invalid uuid", { reservationId: "not-a-uuid" }],
    [
      "extra property",
      {
        extra: true,
        reservationId: "550e8400-e29b-41d4-a716-446655440000",
      },
    ],
  ])("rejects invalid route params: %s", (_caseName, params) => {
    expect(() => reservationRouteParamsSchema.parse(params)).toThrow();
  });
});
