import { eventEntryPageProjection, type Database } from "@idkdo/db";
import type { DomainEventHandler } from "@idkdo/patterns";
import { eq, sql } from "drizzle-orm";

import type { ParticipantCreated } from "../domain/events/participant-created.js";

export class UpdateEventEntryPageOnParticipantCreated
  implements DomainEventHandler<ParticipantCreated>
{
  constructor(private readonly database: Database) {}

  async handle(event: ParticipantCreated): Promise<void> {
    const occurredAt = new Date(event.occurredAt.epochMilliseconds);
    const participant = {
      createdAt: occurredAt.toISOString(),
      eventId: event.eventId.toString(),
      id: event.participantId.toString(),
      name: event.participantName.value,
      updatedAt: occurredAt.toISOString(),
    };

    await this.database
      .update(eventEntryPageProjection)
      .set({
        participants: sql`
          ${eventEntryPageProjection.participants} || jsonb_build_array(
            jsonb_build_object(
              'createdAt', ${participant.createdAt}::text,
              'eventId', ${participant.eventId}::text,
              'id', ${participant.id}::text,
              'name', ${participant.name}::text,
              'updatedAt', ${participant.updatedAt}::text
            )
          )
        `,
        updatedAt: occurredAt,
      })
      .where(eq(eventEntryPageProjection.id, event.eventId.toString()));
  }
}
