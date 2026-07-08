import { describe, expect, it } from "vitest";
import { z } from "zod";

import { zodSerializerCompiler } from "./zod-serializer-compiler.js";

describe("zodSerializerCompiler", () => {
  const schema = z
    .object({
      id: z.string().uuid(),
    })
    .strict();

  it("serializes valid output", () => {
    const serialize = zodSerializerCompiler({
      httpStatus: "201",
      method: "POST",
      schema,
      url: "/events",
    });

    expect(
      serialize({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    ).toBe('{"id":"550e8400-e29b-41d4-a716-446655440000"}');
  });

  it("rejects invalid output", () => {
    const serialize = zodSerializerCompiler({
      httpStatus: "201",
      method: "POST",
      schema,
      url: "/events",
    });

    expect(() => serialize({ id: "not-a-uuid" })).toThrow();
  });
});
