import { describe, expect, it } from "vitest";

import { reservationContributorRouteParamsSchema } from "./reservation-contributor-route-params-schema.js";

describe("reservationContributorRouteParamsSchema", () => {
  it("accepts valid Reservation and Participant ids", () => {
    const params = {
      participantId: "550e8400-e29b-41d4-a716-446655440001",
      reservationId: "550e8400-e29b-41d4-a716-446655440000",
    };

    expect(reservationContributorRouteParamsSchema.parse(params)).toEqual(
      params,
    );
  });

  it.each([
    ["missing participant id", { reservationId: "550e8400-e29b-41d4-a716-446655440000" }],
    ["missing reservation id", { participantId: "550e8400-e29b-41d4-a716-446655440001" }],
    [
      "invalid participant uuid",
      {
        participantId: "not-a-uuid",
        reservationId: "550e8400-e29b-41d4-a716-446655440000",
      },
    ],
    [
      "invalid reservation uuid",
      {
        participantId: "550e8400-e29b-41d4-a716-446655440001",
        reservationId: "not-a-uuid",
      },
    ],
    [
      "extra property",
      {
        extra: true,
        participantId: "550e8400-e29b-41d4-a716-446655440001",
        reservationId: "550e8400-e29b-41d4-a716-446655440000",
      },
    ],
  ])("rejects invalid route params: %s", (_caseName, params) => {
    expect(() => reservationContributorRouteParamsSchema.parse(params)).toThrow();
  });
});
