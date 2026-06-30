import { describe, expect, it } from "vitest";

import { BlankParticipantNameError } from "../errors/blank-participant-name-error.js";
import { ParticipantName } from "./participant-name.js";

describe("ParticipantName", () => {
  it("trims surrounding whitespace", () => {
    expect(ParticipantName.create("  Alice  ").value).toBe("Alice");
  });

  it("rejects blank values", () => {
    expect(() => ParticipantName.create("   ")).toThrow(BlankParticipantNameError);
  });
});
