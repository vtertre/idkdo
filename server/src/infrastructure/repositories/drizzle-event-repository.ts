import { events, participants, type Database } from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import { asc, eq, sql } from "drizzle-orm";
import { Temporal } from "@js-temporal/polyfill";

import { Event } from "../../domain/entities/event.js";
import { Participant } from "../../domain/entities/participant.js";
import type { EventRepository } from "../../domain/repositories/event-repository.js";
import { EventName } from "../../domain/value-objects/event-name.js";
import { ParticipantName } from "../../domain/value-objects/participant-name.js";

export class DrizzleEventRepository implements EventRepository {
  constructor(private readonly database: Database) {}

  async add(event: Event): Promise<void> {
    await this.database.insert(events).values({
      createdAt: instantToDate(event.createdAt),
      id: event.id.toString(),
      name: event.name.value,
      updatedAt: instantToDate(event.updatedAt),
    });
  }

  async get(id: Uuid): Promise<Event | null> {
    const eventRows = await this.database
      .select()
      .from(events)
      .where(eq(events.id, id.toString()))
      .limit(1);
    const row = eventRows[0];

    if (!row) {
      return null;
    }

    const participantRows = await this.database
      .select()
      .from(participants)
      .where(eq(participants.eventId, id.toString()))
      .orderBy(asc(participants.createdAt), asc(participants.id));

    return eventFromRow(row, participantRows);
  }

  async update(event: Event): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(events)
        .set({
          name: event.name.value,
          updatedAt: instantToDate(event.updatedAt),
        })
        .where(eq(events.id, event.id.toString()));

      const eventParticipants = event.getParticipants();

      if (eventParticipants.length === 0) {
        return;
      }

      await transaction
        .insert(participants)
        .values(
          eventParticipants.map((participant) => ({
            createdAt: instantToDate(participant.createdAt),
            eventId: participant.eventId.toString(),
            id: participant.id.toString(),
            name: participant.name.value,
            updatedAt: instantToDate(participant.updatedAt),
          })),
        )
        .onConflictDoUpdate({
          set: {
            name: sql`excluded.name`,
            updatedAt: sql`excluded.updated_at`,
          },
          target: participants.id,
        });
    });
  }

  async exists(id: Uuid): Promise<boolean> {
    const rows = await this.database
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, id.toString()))
      .limit(1);

    return rows.length > 0;
  }
}

type EventRow = typeof events.$inferSelect;
type ParticipantRow = typeof participants.$inferSelect;

function eventFromRow(row: EventRow, participantRows: readonly ParticipantRow[]): Event {
  return Event.rehydrate({
    createdAt: dateToInstant(row.createdAt),
    id: Uuid.parse(row.id),
    name: EventName.create(row.name),
    participants: participantRows.map(participantFromRow),
    updatedAt: dateToInstant(row.updatedAt),
  });
}

function participantFromRow(row: ParticipantRow): Participant {
  return Participant.rehydrate({
    createdAt: dateToInstant(row.createdAt),
    eventId: Uuid.parse(row.eventId),
    id: Uuid.parse(row.id),
    name: ParticipantName.create(row.name),
    updatedAt: dateToInstant(row.updatedAt),
  });
}

function dateToInstant(date: Date): Temporal.Instant {
  return Temporal.Instant.from(date.toISOString());
}

function instantToDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}
