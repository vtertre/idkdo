import { describe, expect, it } from "vitest";

import { AppError } from "./app-error.js";
import { NotFoundError } from "./not-found-error.js";

describe("NotFoundError", () => {
  it("defaults to the shared resource-not-found contract", () => {
    const error = new NotFoundError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.name).toBe("NotFoundError");
    expect(error.message).toBe("Resource not found.");
    expect(error.code).toBe("RESOURCE_NOT_FOUND");
  });
});
