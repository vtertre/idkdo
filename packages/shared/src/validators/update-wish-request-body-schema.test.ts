import { describe, expect, it } from "vitest";

import { createWishRequestBodySchema } from "./create-wish-request-body-schema.js";
import { updateWishRequestBodySchema } from "./update-wish-request-body-schema.js";

describe("updateWishRequestBodySchema", () => {
  it("uses the Wish content request contract", () => {
    const body = { content: "  Chocolat\nhttps://example.com/x  " };

    expect(updateWishRequestBodySchema).toBe(createWishRequestBodySchema);
    expect(updateWishRequestBodySchema.parse(body)).toEqual({
      content: "Chocolat\nhttps://example.com/x",
    });
  });
});
