import { describe, expect, it } from "vitest";

import { BlankEventNameError } from "../errors/blank-event-name-error.js";
import { EventName } from "./event-name.js";

describe("EventName", () => {
  it("uses the trimmed name value", () => {
    const name = EventName.create("  Christmas 2026  ");

    expect(name.value).toBe("Christmas 2026");
  });

  it.each(["", "   ", "\n\t"])("rejects blank names: %j", (rawName) => {
    expect(() => EventName.create(rawName)).toThrow(BlankEventNameError);
  });
});
