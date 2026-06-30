import { type DomainEvent, Uuid } from "@idkdo/patterns";
import type { Temporal } from "@js-temporal/polyfill";

import type { ParticipantName } from "../value-objects/participant-name.js";

export class ParticipantCreated implements DomainEvent {
  readonly aggregateType = "Event";
  readonly domainEventId = Uuid.random();

  constructor(
    readonly eventId: Uuid,
    readonly occurredAt: Temporal.Instant,
    readonly participantId: Uuid,
    readonly participantName: ParticipantName,
  ) {}

  get aggregateId(): Uuid {
    return this.eventId;
  }
}
