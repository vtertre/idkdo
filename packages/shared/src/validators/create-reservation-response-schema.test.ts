import { describe, expect, it } from "vitest";

import { createReservationResponseSchema } from "./create-reservation-response-schema.js";

describe("createReservationResponseSchema", () => {
  it("accepts the shared reservation summary", () => {
    const response = {
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

    expect(createReservationResponseSchema.parse(response)).toEqual(response);
  });
});
