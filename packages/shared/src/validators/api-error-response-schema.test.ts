import { describe, expect, it } from "vitest";

import { apiErrorResponseSchema } from "./api-error-response-schema.js";

describe("apiErrorResponseSchema", () => {
  it("accepts the stable API error shape", () => {
    const response = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request body.",
      },
    };

    expect(apiErrorResponseSchema.parse(response)).toEqual(response);
  });

  it("rejects additional properties", () => {
    expect(() =>
      apiErrorResponseSchema.parse({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body.",
          details: [],
        },
      }),
    ).toThrow();
  });
});
