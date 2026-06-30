import type { Temporal } from "@js-temporal/polyfill";

export function instantToIsoString(instant: Temporal.Instant): string {
  return new Date(instant.epochMilliseconds).toISOString();
}
