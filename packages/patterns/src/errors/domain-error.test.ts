import { describe, expect, it } from "vitest";

import { DomainError } from "./domain-error.js";

describe("DomainError", () => {
  it("preserves name, message, code, and cause", () => {
    const cause = new Error("cause");
    const error = new DomainError("Something went wrong", { cause, code: "SOMETHING_WENT_WRONG" });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DomainError");
    expect(error.message).toBe("Something went wrong");
    expect(error.code).toBe("SOMETHING_WENT_WRONG");
    expect(error.cause).toBe(cause);
  });
});
