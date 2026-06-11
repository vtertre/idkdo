import type { Temporal } from "@js-temporal/polyfill";

import type { Uuid } from "./uuid.js";

export interface DomainEvent {
  readonly domainEventId: Uuid;
  readonly occurredAt: Temporal.Instant;
  readonly aggregateType: string;
  readonly aggregateId: Uuid;
}
