import { describe, expect, it } from "vitest";

import { addContributorResponseSchema } from "./add-contributor-response-schema.js";

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

describe("addContributorResponseSchema", () => {
  it("accepts a reservation summary", () => {
    expect(addContributorResponseSchema.parse(summary)).toEqual(summary);
  });

  it.each([
    ["invalid uuid", { ...summary, id: "not-a-uuid" }],
    ["extra property", { ...summary, note: "Surprise" }],
  ])("rejects invalid responses: %s", (_caseName, response) => {
    expect(() => addContributorResponseSchema.parse(response)).toThrow();
  });
});
