import { participants, type Database } from "@idkdo/db";
import { eq } from "drizzle-orm";

type ParticipantEventIdDatabase = Pick<Database, "select">;

export async function getParticipantEventId(
  db: ParticipantEventIdDatabase,
  participantId: string,
): Promise<string | null> {
  const rows = await db
    .select({ eventId: participants.eventId })
    .from(participants)
    .where(eq(participants.id, participantId))
    .limit(1);

  return rows[0]?.eventId ?? null;
}
