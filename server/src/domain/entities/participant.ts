import { BaseEntity, Uuid } from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";

import type { ParticipantName } from "../value-objects/participant-name.js";

export type CreateParticipantInput = {
  readonly eventId: Uuid;
  readonly name: ParticipantName;
  readonly now?: Temporal.Instant;
};

export type RehydrateParticipantInput = {
  readonly createdAt: Temporal.Instant;
  readonly eventId: Uuid;
  readonly id: Uuid;
  readonly name: ParticipantName;
  readonly updatedAt: Temporal.Instant;
};

export class Participant extends BaseEntity<Uuid> {
  private constructor(
    id: Uuid,
    readonly eventId: Uuid,
    readonly name: ParticipantName,
    readonly createdAt: Temporal.Instant,
    readonly updatedAt: Temporal.Instant,
  ) {
    super(id);
  }

  static create(input: CreateParticipantInput): Participant {
    const now = input.now ?? Temporal.Now.instant();

    return new Participant(
      Uuid.random(),
      input.eventId,
      input.name,
      now,
      now,
    );
  }

  static rehydrate(input: RehydrateParticipantInput): Participant {
    return new Participant(
      input.id,
      input.eventId,
      input.name,
      input.createdAt,
      input.updatedAt,
    );
  }
}
