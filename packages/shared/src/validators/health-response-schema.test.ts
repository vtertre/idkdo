import { describe, expect, it } from "vitest";

import { healthResponseSchema } from "./health-response-schema.js";

describe("healthResponseSchema", () => {
  it("accepts the health response contract", () => {
    const response = {
      service: "idkdo-api",
      status: "ok",
    };

    expect(healthResponseSchema.parse(response)).toEqual(response);
  });

  it("rejects additional properties", () => {
    expect(() =>
      healthResponseSchema.parse({
        service: "idkdo-api",
        status: "ok",
        version: "0.0.0",
      }),
    ).toThrow();
  });
});
