import type { CommandHandler, DomainEvent } from "@idkdo/patterns";
import type { ParticipantSummary } from "@idkdo/shared";

import { EventNotFoundError } from "../../domain/errors/event-not-found-error.js";
import { ParticipantNameAlreadyExistsError } from "../../domain/errors/participant-name-already-exists-error.js";
import type { EventRepository } from "../../domain/repositories/event-repository.js";
import { ParticipantName } from "../../domain/value-objects/participant-name.js";
import { CreateParticipantCommand } from "./create-participant-command.js";
import { participantToSummary } from "./participant-to-summary.js";

export class CreateParticipantCommandHandler
  implements CommandHandler<CreateParticipantCommand, ParticipantSummary>
{
  constructor(private readonly eventRepository: EventRepository) {}

  async execute(
    command: CreateParticipantCommand,
  ): Promise<[ParticipantSummary, DomainEvent[]]> {
    const event = await this.eventRepository.get(command.eventId);

    if (!event) {
      throw new EventNotFoundError();
    }

    const [updatedEvent, participant, domainEvents] = event.addParticipant({
      name: ParticipantName.create(command.name),
    });

    try {
      await this.eventRepository.update(updatedEvent);
    } catch (error) {
      if (isUniqueParticipantNameViolation(error)) {
        throw new ParticipantNameAlreadyExistsError();
      }

      throw error;
    }

    return [participantToSummary(participant), domainEvents];
  }
}

function isUniqueParticipantNameViolation(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return (
    error["code"] === "23505" &&
    error["constraint_name"] === "participants_event_id_name_unique"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
