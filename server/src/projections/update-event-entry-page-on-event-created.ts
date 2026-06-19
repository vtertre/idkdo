import { eventEntryPageProjection, type Database } from "@idkdo/db";
import type { DomainEventHandler } from "@idkdo/patterns";

import type { EventCreated } from "../domain/events/event-created.js";

export class UpdateEventEntryPageOnEventCreated
  implements DomainEventHandler<EventCreated>
{
  constructor(private readonly database: Database) {}

  async handle(event: EventCreated): Promise<void> {
    const occurredAt = new Date(event.occurredAt.epochMilliseconds);

    await this.database
      .insert(eventEntryPageProjection)
      .values({
        createdAt: occurredAt,
        id: event.eventId.toString(),
        name: event.name.value,
        updatedAt: occurredAt,
      })
      .onConflictDoUpdate({
        set: {
          name: event.name.value,
          updatedAt: occurredAt,
        },
        target: eventEntryPageProjection.id,
      });
  }
}
