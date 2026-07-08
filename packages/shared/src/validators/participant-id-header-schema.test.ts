import { describe, expect, it } from "vitest";

import {
  participantIdHeaderName,
  participantIdHeaderSchema,
} from "./participant-id-header-schema.js";

describe("participantIdHeaderSchema", () => {
  it("accepts a valid lowercase Participant id header and keeps other headers", () => {
    const headers = {
      "content-type": "application/json",
      host: "localhost:3000",
      [participantIdHeaderName]: "550e8400-e29b-41d4-a716-446655440000",
    };

    expect(participantIdHeaderSchema.parse(headers)).toEqual(headers);
  });

  it.each([
    ["missing header", {}],
    ["invalid uuid", { [participantIdHeaderName]: "not-a-uuid" }],
    [
      "uppercase-only header",
      { "X-Participant-Id": "550e8400-e29b-41d4-a716-446655440000" },
    ],
  ])("rejects invalid Participant id headers: %s", (_caseName, headers) => {
    expect(() => participantIdHeaderSchema.parse(headers)).toThrow();
  });
});
