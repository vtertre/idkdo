import { wishes, type Database } from "@idkdo/db";
import type { GetParticipantWishesResponse, WishSummary } from "@idkdo/shared";
import { asc, eq } from "drizzle-orm";

import { NotFoundError } from "../../errors/not-found-error.js";
import { getParticipantEventId } from "../participants/get-participant-event-id.js";

export type GetParticipantWishesInput = {
  readonly participantId: string;
  readonly viewerParticipantId: string;
};

export async function getParticipantWishes(
  db: Database,
  input: GetParticipantWishesInput,
): Promise<GetParticipantWishesResponse> {
  const participantEventId = await getParticipantEventId(db, input.participantId);

  if (participantEventId === null) {
    throw new NotFoundError();
  }

  const viewerEventId = await getParticipantEventId(db, input.viewerParticipantId);

  if (viewerEventId === null || viewerEventId !== participantEventId) {
    throw new NotFoundError();
  }

  const wishRows = await db
    .select()
    .from(wishes)
    .where(eq(wishes.wisherId, input.participantId))
    .orderBy(asc(wishes.createdAt), asc(wishes.id));

  return {
    wishes: wishRows.map(toWishSummary),
  };
}

type WishRow = typeof wishes.$inferSelect;

function toWishSummary(row: WishRow): WishSummary {
  return {
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    eventId: row.eventId,
    id: row.id,
    updatedAt: row.updatedAt.toISOString(),
    wisherId: row.wisherId,
  };
}
