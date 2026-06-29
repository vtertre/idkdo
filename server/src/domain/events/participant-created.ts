import { type DomainEvent, Uuid } from "@idkdo/patterns";
import type { Temporal } from "@js-temporal/polyfill";

import type { ParticipantName } from "../value-objects/participant-name.js";

export type ParticipantCreatedInput = {
  readonly eventId: Uuid;
  readonly occurredAt: Temporal.Instant;
  readonly participantId: Uuid;
  readonly participantName: ParticipantName;
};

export class ParticipantCreated implements DomainEvent {
  readonly aggregateType = "Event";
  readonly domainEventId = Uuid.random();

  constructor(
    readonly eventId: Uuid,
    readonly occurredAt: Temporal.Instant,
    readonly participantId: Uuid,
    readonly participantName: ParticipantName,
  ) {}

  static create(input: ParticipantCreatedInput): ParticipantCreated {
    return new ParticipantCreated(
      input.eventId,
      input.occurredAt,
      input.participantId,
      input.participantName,
    );
  }

  get aggregateId(): Uuid {
    return this.eventId;
  }
}
