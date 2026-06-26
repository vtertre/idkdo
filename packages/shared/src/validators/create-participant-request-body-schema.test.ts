import { describe, expect, it } from "vitest";

import { createParticipantRequestBodySchema } from "./create-participant-request-body-schema.js";

describe("createParticipantRequestBodySchema", () => {
  it("trims and accepts a valid Participant name", () => {
    expect(
      createParticipantRequestBodySchema.parse({ name: "  Alice  " }),
    ).toEqual({
      name: "Alice",
    });
  });

  it.each([
    ["missing name", {}],
    ["blank name", { name: "   " }],
    ["non-string name", { name: 123 }],
    ["extra property", { name: "Alice", extra: true }],
  ])("rejects invalid request bodies: %s", (_caseName, body) => {
    expect(() => createParticipantRequestBodySchema.parse(body)).toThrow();
  });
});
