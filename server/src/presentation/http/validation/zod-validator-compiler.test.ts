import { describe, expect, it } from "vitest";
import { z } from "zod";

import { zodValidatorCompiler } from "./zod-validator-compiler.js";

describe("zodValidatorCompiler", () => {
  const schema = z
    .object({
      name: z.string().trim().min(1),
    })
    .strict();

  it("returns parsed output", () => {
    const validate = zodValidatorCompiler({
      httpPart: "body",
      method: "POST",
      schema,
      url: "/events",
    });

    expect(validate({ name: "  Christmas 2026  " })).toEqual({
      value: { name: "Christmas 2026" },
    });
  });

  it("returns validation errors instead of throwing", () => {
    const validate = zodValidatorCompiler({
      httpPart: "body",
      method: "POST",
      schema,
      url: "/events",
    });
    const result = validate({});

    expect(result).toHaveProperty("error");
    expect(result).not.toHaveProperty("value");
  });
});
