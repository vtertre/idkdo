import { describe, expect, it } from "vitest";

import { addContributorRequestBodySchema } from "./add-contributor-request-body-schema.js";

describe("addContributorRequestBodySchema", () => {
  it("accepts a valid Participant id", () => {
    const body = {
      participantId: "550e8400-e29b-41d4-a716-446655440000",
    };

    expect(addContributorRequestBodySchema.parse(body)).toEqual(body);
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
  ])("rejects invalid request bodies: %s", (_caseName, body) => {
    expect(() => addContributorRequestBodySchema.parse(body)).toThrow();
  });
});
