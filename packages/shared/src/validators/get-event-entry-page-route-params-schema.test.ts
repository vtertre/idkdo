import { describe, expect, it } from "vitest";

import { getEventEntryPageRouteParamsSchema } from "./get-event-entry-page-route-params-schema.js";

describe("getEventEntryPageRouteParamsSchema", () => {
  it("accepts an Event id", () => {
    expect(
      getEventEntryPageRouteParamsSchema.parse({
        eventId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toEqual({
      eventId: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("rejects a non-UUID Event id", () => {
    expect(() =>
      getEventEntryPageRouteParamsSchema.parse({ eventId: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects the nil UUID", () => {
    expect(() =>
      getEventEntryPageRouteParamsSchema.parse({
        eventId: "00000000-0000-0000-0000-000000000000",
      }),
    ).toThrow();
  });
});
