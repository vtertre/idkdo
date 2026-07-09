import { wishes, type Database } from "@idkdo/db";
import type { WishSummary } from "@idkdo/shared";
import { eq, sql } from "drizzle-orm";

import { NotFoundError } from "../../errors/not-found-error.js";
import { getParticipantEventId } from "../participants/get-participant-event-id.js";
import { CannotModifyAnotherParticipantWishError } from "./errors/cannot-modify-another-participant-wish-error.js";
import { toWishSummary } from "./to-wish-summary.js";

export type UpdateWishInput = {
  readonly actorParticipantId: string;
  readonly content: string;
  readonly wishId: string;
};

export async function updateWish(
  db: Database,
  input: UpdateWishInput,
): Promise<WishSummary> {
  return db.transaction(async (transaction) => {
    const wishRows = await transaction
      .select({ eventId: wishes.eventId, wisherId: wishes.wisherId })
      .from(wishes)
      .where(eq(wishes.id, input.wishId))
      .limit(1);
    const wish = wishRows[0];

    if (!wish) {
      throw new NotFoundError();
    }

    const actorEventId = await getParticipantEventId(
      transaction,
      input.actorParticipantId,
    );

    if (actorEventId === null || actorEventId !== wish.eventId) {
      throw new NotFoundError();
    }

    if (input.actorParticipantId !== wish.wisherId) {
      throw new CannotModifyAnotherParticipantWishError();
    }

    const updatedRows = await transaction
      .update(wishes)
      .set({
        content: input.content,
        updatedAt: sql`now()`,
      })
      .where(eq(wishes.id, input.wishId))
      .returning();
    const updatedWish = updatedRows[0];

    if (!updatedWish) {
      throw new NotFoundError();
    }

    return toWishSummary(updatedWish);
  });
}
