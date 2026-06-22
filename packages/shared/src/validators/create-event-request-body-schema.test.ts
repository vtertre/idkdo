import { describe, expect, it } from "vitest";

import { createEventRequestBodySchema } from "./create-event-request-body-schema.js";

describe("createEventRequestBodySchema", () => {
  it("trims and accepts a valid Event name", () => {
    expect(
      createEventRequestBodySchema.parse({ name: "  Christmas 2026  " }),
    ).toEqual({
      name: "Christmas 2026",
    });
  });

  it.each([
    ["missing name", {}],
    ["blank name", { name: "   " }],
    ["non-string name", { name: 123 }],
    ["extra property", { name: "Christmas 2026", extra: true }],
  ])("rejects invalid request bodies: %s", (_caseName, body) => {
    expect(() => createEventRequestBodySchema.parse(body)).toThrow();
  });
});
