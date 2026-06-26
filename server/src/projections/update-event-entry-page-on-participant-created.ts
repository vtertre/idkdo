import { eventEntryPageProjection, type Database } from "@idkdo/db";
import type { DomainEventHandler } from "@idkdo/patterns";
import { sql } from "drizzle-orm";

import type { ParticipantCreated } from "../domain/events/participant-created.js";

export class UpdateEventEntryPageOnParticipantCreated
  implements DomainEventHandler<ParticipantCreated>
{
  constructor(private readonly database: Database) {}

  async handle(event: ParticipantCreated): Promise<void> {
    const eventCreatedAt = new Date(event.eventCreatedAt.epochMilliseconds);
    const occurredAt = new Date(event.occurredAt.epochMilliseconds);
    const participant = {
      createdAt: occurredAt.toISOString(),
      eventId: event.eventId.toString(),
      id: event.participantId.toString(),
      name: event.participantName.value,
      updatedAt: occurredAt.toISOString(),
    };

    await this.database
      .insert(eventEntryPageProjection)
      .values({
        createdAt: eventCreatedAt,
        id: event.eventId.toString(),
        name: event.eventName.value,
        participants: [participant],
        updatedAt: occurredAt,
      })
      .onConflictDoUpdate({
        set: {
          name: event.eventName.value,
          participants: sql`
            coalesce(${eventEntryPageProjection.participants}, '[]'::jsonb) || jsonb_build_array(
              jsonb_build_object(
                'createdAt', ${participant.createdAt}::text,
                'eventId', ${participant.eventId}::text,
                'id', ${participant.id}::text,
                'name', ${participant.name}::text,
                'updatedAt', ${participant.updatedAt}::text
              )
            )
          `,
          updatedAt: sql`greatest(${eventEntryPageProjection.updatedAt}, ${occurredAt}::timestamptz)`,
        },
        target: eventEntryPageProjection.id,
      });
  }
}
