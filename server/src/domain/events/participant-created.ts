import { type DomainEvent, Uuid } from "@idkdo/patterns";
import type { Temporal } from "@js-temporal/polyfill";

import type { EventName } from "../value-objects/event-name.js";
import type { ParticipantName } from "../value-objects/participant-name.js";

export type ParticipantCreatedInput = {
  readonly eventCreatedAt: Temporal.Instant;
  readonly eventId: Uuid;
  readonly eventName: EventName;
  readonly occurredAt: Temporal.Instant;
  readonly participantId: Uuid;
  readonly participantName: ParticipantName;
};

export class ParticipantCreated implements DomainEvent {
  readonly aggregateType = "Event";
  readonly domainEventId = Uuid.random();
  readonly eventCreatedAt: Temporal.Instant;
  readonly eventId: Uuid;
  readonly eventName: EventName;
  readonly participantId: Uuid;
  readonly participantName: ParticipantName;
  readonly occurredAt: Temporal.Instant;

  private constructor(input: ParticipantCreatedInput) {
    this.eventCreatedAt = input.eventCreatedAt;
    this.eventId = input.eventId;
    this.eventName = input.eventName;
    this.occurredAt = input.occurredAt;
    this.participantId = input.participantId;
    this.participantName = input.participantName;
  }

  static create(input: ParticipantCreatedInput): ParticipantCreated {
    return new ParticipantCreated(input);
  }

  get aggregateId(): Uuid {
    return this.eventId;
  }
}
