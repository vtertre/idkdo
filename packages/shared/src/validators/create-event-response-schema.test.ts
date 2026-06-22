import { describe, expect, it } from "vitest";

import { createEventResponseSchema } from "./create-event-response-schema.js";

describe("createEventResponseSchema", () => {
  it("accepts the created Event response", () => {
    const response = {
      id: "550e8400-e29b-41d4-a716-446655440000",
    };

    expect(createEventResponseSchema.parse(response)).toEqual(response);
  });

  it.each([
    ["missing id", {}],
    ["non-UUID id", { id: "not-a-uuid" }],
    ["extra property", { id: "550e8400-e29b-41d4-a716-446655440000", name: "x" }],
  ])("rejects invalid created Event responses: %s", (_caseName, response) => {
    expect(() => createEventResponseSchema.parse(response)).toThrow();
  });
});
