import { describe, expect, it } from "vitest";

import { NoHandlerFoundError } from "./no-handler-found-error.js";

class CreateWishCommand {}

describe("NoHandlerFoundError", () => {
  it("captures the missing message class and name separately from the message text", () => {
    const error = new NoHandlerFoundError(CreateWishCommand);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("NoHandlerFoundError");
    expect(error.messageClass).toBe(CreateWishCommand);
    expect(error.messageName).toBe("CreateWishCommand");
    expect(error.message).toBe("No handler found for CreateWishCommand");
  });
});
