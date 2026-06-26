import { describe, expect, it } from "vitest";

import { createParticipantResponseSchema } from "./create-participant-response-schema.js";

describe("createParticipantResponseSchema", () => {
  it("accepts the Participant create response contract", () => {
    const response = {
      createdAt: "2026-06-26T10:00:00.000Z",
      eventId: "550e8400-e29b-41d4-a716-446655440000",
      id: "660e8400-e29b-41d4-a716-446655440000",
      name: "Alice",
      updatedAt: "2026-06-26T10:00:00.000Z",
    };

    expect(createParticipantResponseSchema.parse(response)).toEqual(response);
  });
});
