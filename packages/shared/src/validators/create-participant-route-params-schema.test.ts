import { describe, expect, it } from "vitest";

import { createParticipantRouteParamsSchema } from "./create-participant-route-params-schema.js";

describe("createParticipantRouteParamsSchema", () => {
  it("accepts a valid Event id", () => {
    const params = {
      eventId: "550e8400-e29b-41d4-a716-446655440000",
    };

    expect(createParticipantRouteParamsSchema.parse(params)).toEqual(params);
  });

  it.each([
    ["missing event id", {}],
    ["invalid uuid", { eventId: "not-a-uuid" }],
    ["nil uuid", { eventId: "00000000-0000-0000-0000-000000000000" }],
    ["extra property", { eventId: "550e8400-e29b-41d4-a716-446655440000", extra: true }],
  ])("rejects invalid route params: %s", (_caseName, params) => {
    expect(() => createParticipantRouteParamsSchema.parse(params)).toThrow();
  });
});
