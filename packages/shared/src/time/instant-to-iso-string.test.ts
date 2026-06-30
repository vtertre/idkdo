import { describe, expect, it } from "vitest";

import { instantToIsoString } from "./instant-to-iso-string.js";

describe("instantToIsoString", () => {
  it("formats an Instant-like value as an ISO string", () => {
    expect(
      instantToIsoString({
        epochMilliseconds: Date.parse("2026-06-26T10:00:00.000Z"),
      }),
    ).toBe("2026-06-26T10:00:00.000Z");
  });
});
