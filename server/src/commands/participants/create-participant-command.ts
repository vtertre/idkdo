import type { Command, Uuid, commandResultType } from "@idkdo/patterns";
import type { ParticipantSummary } from "@idkdo/shared";

export class CreateParticipantCommand implements Command<ParticipantSummary> {
  declare readonly [commandResultType]: ParticipantSummary;

  constructor(
    readonly eventId: Uuid,
    readonly name: string,
  ) {}
}
