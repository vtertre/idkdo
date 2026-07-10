import { describe, expect, it } from "vitest";

import { AppError } from "./app-error.js";
import { StateConflictError } from "./state-conflict-error.js";

describe("StateConflictError", () => {
  it("is an application error for state conflicts", () => {
    const error = new StateConflictError("State conflict.", "STATE_CONFLICT");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(StateConflictError);
    expect(error.name).toBe("StateConflictError");
    expect(error.code).toBe("STATE_CONFLICT");
  });
});
