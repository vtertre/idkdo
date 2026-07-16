import { describe, expect, it } from "vitest";

import { removeContributorResponseSchema } from "./remove-contributor-response-schema.js";

const summary = {
  contributors: [
    {
      createdAt: "2026-07-08T10:00:00.000Z",
      participantId: "00000000-0000-4000-8000-000000000101",
    },
  ],
  createdAt: "2026-07-08T10:00:00.000Z",
  id: "00000000-0000-4000-8000-000000000401",
  updatedAt: "2026-07-08T10:00:00.000Z",
  wishId: "00000000-0000-4000-8000-000000000301",
};

describe("removeContributorResponseSchema", () => {
  it("accepts a populated reservation summary", () => {
    const response = { reservation: summary };

    expect(removeContributorResponseSchema.parse(response)).toEqual(response);
  });

  it("accepts a null reservation", () => {
    expect(removeContributorResponseSchema.parse({ reservation: null })).toEqual(
      { reservation: null },
    );
  });

  it.each([
    ["missing reservation", {}],
    ["invalid uuid", { reservation: { ...summary, id: "not-a-uuid" } }],
    ["extra property", { extra: true, reservation: null }],
  ])("rejects invalid responses: %s", (_caseName, response) => {
    expect(() => removeContributorResponseSchema.parse(response)).toThrow();
  });
});
