import { describe, expect, it } from "vitest";

import { createWishRequestBodySchema } from "./create-wish-request-body-schema.js";

describe("createWishRequestBodySchema", () => {
  it("trims edges and preserves interior line breaks", () => {
    expect(
      createWishRequestBodySchema.parse({
        content: "  Nintendo Switch\nhttps://example.com/item  ",
      }),
    ).toEqual({
      content: "Nintendo Switch\nhttps://example.com/item",
    });
  });

  it.each([
    ["missing content", {}],
    ["blank content", { content: " \n " }],
    ["non-string content", { content: 123 }],
    ["extra property", { content: "Nintendo Switch", extra: true }],
  ])("rejects invalid request bodies: %s", (_caseName, body) => {
    expect(() => createWishRequestBodySchema.parse(body)).toThrow();
  });
});
