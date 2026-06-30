import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { instantToIsoString } from "./instant-to-iso-string.js";

describe("instantToIsoString", () => {
  it("formats a Temporal Instant as an ISO string", () => {
    expect(
      instantToIsoString(Temporal.Instant.from("2026-06-26T10:00:00.000Z")),
    ).toBe("2026-06-26T10:00:00.000Z");
  });
});
