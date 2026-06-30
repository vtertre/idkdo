import { BaseAggregateRoot, Uuid } from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";

import { EventCreated } from "../events/event-created.js";
import { ParticipantCreated } from "../events/participant-created.js";
import { ParticipantNameAlreadyExistsError } from "../errors/participant-name-already-exists-error.js";
import type { EventName } from "../value-objects/event-name.js";
import type { ParticipantName } from "../value-objects/participant-name.js";
import { Participant } from "./participant.js";

export type CreateEventInput = {
  readonly name: EventName;
};

export type AddParticipantInput = {
  readonly name: ParticipantName;
};

export type AddParticipantResult = readonly [
  participant: Participant,
  domainEvents: [ParticipantCreated],
];

export type RehydrateEventInput = {
  readonly createdAt: Temporal.Instant;
  readonly id: Uuid;
  readonly name: EventName;
  readonly participants?: readonly Participant[];
  readonly updatedAt: Temporal.Instant;
};

export class Event extends BaseAggregateRoot<Uuid> {
  private readonly participants: Participant[];

  private constructor(
    id: Uuid,
    readonly name: EventName,
    readonly createdAt: Temporal.Instant,
    public updatedAt: Temporal.Instant,
    participants: readonly Participant[],
  ) {
    super(id);
    this.participants = [...participants];
  }

  static create(input: CreateEventInput): [Event, [EventCreated]] {
    const id = Uuid.random();
    const now = Temporal.Now.instant();
    const event = new Event(id, input.name, now, now, []);
    const eventCreated = EventCreated.create({
      eventId: id,
      name: input.name,
      occurredAt: now,
    });

    return [event, [eventCreated]];
  }

  static rehydrate(input: RehydrateEventInput): Event {
    return new Event(
      input.id,
      input.name,
      input.createdAt,
      input.updatedAt,
      input.participants ?? [],
    );
  }

  getParticipants(): readonly Participant[] {
    return this.participants;
  }

  addParticipant(input: AddParticipantInput): AddParticipantResult {
    if (
      this.participants.some(
        (participant) => participant.name.value === input.name.value,
      )
    ) {
      throw new ParticipantNameAlreadyExistsError();
    }

    const participant = Participant.create({
      eventId: this.id,
      name: input.name,
    });
    this.participants.push(participant);
    this.updatedAt = participant.createdAt;

    const participantCreated = new ParticipantCreated(
      this.id,
      participant.createdAt,
      participant.id,
      participant.name,
    );

    return [participant, [participantCreated]];
  }
}
