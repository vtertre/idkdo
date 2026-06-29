import type { Command, Uuid, commandResultType } from "@idkdo/patterns";

import type { Participant } from "../../domain/entities/participant.js";

export class CreateParticipantCommand implements Command<Participant> {
  declare readonly [commandResultType]: Participant;

  constructor(
    readonly eventId: Uuid,
    readonly name: string,
  ) {}
}
