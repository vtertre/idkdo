import { MissingAggregateRootError, type CommandHandler, type DomainEvent } from "@idkdo/patterns";

import type { Participant } from "../../domain/entities/participant.js";
import type { EventRepository } from "../../domain/repositories/event-repository.js";
import { ParticipantName } from "../../domain/value-objects/participant-name.js";
import { CreateParticipantCommand } from "./create-participant-command.js";

export class CreateParticipantCommandHandler
  implements CommandHandler<CreateParticipantCommand, Participant>
{
  constructor(private readonly eventRepository: EventRepository) {}

  async execute(
    command: CreateParticipantCommand,
  ): Promise<[Participant, DomainEvent[]]> {
    const event = await this.eventRepository.get(command.eventId);

    if (!event) {
      throw new MissingAggregateRootError(command.eventId, "Event");
    }

    const [participant, domainEvents] = event.addParticipant({
      name: ParticipantName.create(command.name),
    });

    await this.eventRepository.update(event);

    return [participant, domainEvents];
  }
}
