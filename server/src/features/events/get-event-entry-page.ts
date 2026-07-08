import { events, participants, type Database } from "@idkdo/db";
import type { GetEventEntryPageResponse, ParticipantSummary } from "@idkdo/shared";
import { asc, eq } from "drizzle-orm";

export type GetEventEntryPageInput = {
  readonly eventId: string;
};

export async function getEventEntryPage(
  db: Database,
  input: GetEventEntryPageInput,
): Promise<GetEventEntryPageResponse | null> {
  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.id, input.eventId))
    .limit(1);
  const event = eventRows[0];

  if (!event) {
    return null;
  }

  const participantRows = await db
    .select()
    .from(participants)
    .where(eq(participants.eventId, input.eventId))
    .orderBy(asc(participants.createdAt), asc(participants.id));

  return {
    createdAt: event.createdAt.toISOString(),
    id: event.id,
    name: event.name,
    participants: participantRows.map(toParticipantSummary),
    updatedAt: event.updatedAt.toISOString(),
  };
}

type ParticipantRow = typeof participants.$inferSelect;

function toParticipantSummary(row: ParticipantRow): ParticipantSummary {
  return {
    createdAt: row.createdAt.toISOString(),
    eventId: row.eventId,
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
  };
}
