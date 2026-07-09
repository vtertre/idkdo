import { describe, expect, it } from "vitest";

import { wishRouteParamsSchema } from "./wish-route-params-schema.js";

describe("wishRouteParamsSchema", () => {
  it("accepts a valid Wish id", () => {
    const params = {
      wishId: "550e8400-e29b-41d4-a716-446655440000",
    };

    expect(wishRouteParamsSchema.parse(params)).toEqual(params);
  });

  it.each([
    ["missing wish id", {}],
    ["invalid uuid", { wishId: "not-a-uuid" }],
    [
      "extra property",
      {
        extra: true,
        wishId: "550e8400-e29b-41d4-a716-446655440000",
      },
    ],
  ])("rejects invalid route params: %s", (_caseName, params) => {
    expect(() => wishRouteParamsSchema.parse(params)).toThrow();
  });
});
