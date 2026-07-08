import { describe, expect, it } from "vitest";

import { AppError } from "./app-error.js";

describe("AppError", () => {
  it("carries a stable application error code", () => {
    const cause = new Error("cause");
    const error = new AppError("Something failed.", "SOMETHING_FAILED", {
      cause,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe("AppError");
    expect(error.message).toBe("Something failed.");
    expect(error.code).toBe("SOMETHING_FAILED");
    expect(error.cause).toBe(cause);
  });
});
