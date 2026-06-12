import { describe, expect, it } from "vitest";
import { z } from "zod";

import { RequestValidationError } from "../errors/request-validation-error.js";
import { parseRequestBody } from "./parse-request-body.js";

const testRequestBodySchema = z
  .object({
    name: z.string().trim().min(1),
  })
  .strict();

describe("parseRequestBody", () => {
  it("returns the parsed body", () => {
    expect(parseRequestBody(testRequestBodySchema, { name: "  Christmas 2026  " }))
      .toEqual({ name: "Christmas 2026" });
  });

  it.each([
    ["missing name", {}],
    ["blank name", { name: "   " }],
    ["non-string name", { name: 123 }],
    ["extra property", { name: "Christmas 2026", extra: true }],
  ])("throws a request validation error for invalid bodies: %s", (_caseName, body) => {
    expect(() => parseRequestBody(testRequestBodySchema, body)).toThrow(
      RequestValidationError,
    );
  });
});
