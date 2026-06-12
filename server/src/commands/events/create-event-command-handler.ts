import type { CommandHandler, DomainEvent, Uuid } from "@idkdo/patterns";

import { Event } from "../../domain/entities/event.js";
import type { EventRepository } from "../../domain/repositories/event-repository.js";
import { EventName } from "../../domain/value-objects/event-name.js";
import {
  CreateEventCommand,
} from "./create-event-command.js";

export class CreateEventCommandHandler
  implements CommandHandler<CreateEventCommand, Uuid>
{
  constructor(private readonly eventRepository: EventRepository) {}

  async execute(command: CreateEventCommand): Promise<[Uuid, DomainEvent[]]> {
    const [event, domainEvents] = Event.create({
      name: EventName.create(command.name),
    });

    await this.eventRepository.add(event);

    return [event.id, domainEvents];
  }
}
