import { wishes, type Database } from "@idkdo/db";
import { eq } from "drizzle-orm";

import { NotFoundError } from "../../errors/not-found-error.js";
import { getParticipantEventId } from "../participants/get-participant-event-id.js";
import { CannotModifyAnotherParticipantWishError } from "./errors/cannot-modify-another-participant-wish-error.js";

export type DeleteWishInput = {
  readonly actorParticipantId: string;
  readonly wishId: string;
};

export async function deleteWish(
  db: Database,
  input: DeleteWishInput,
): Promise<void> {
  await db.transaction(async (transaction) => {
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

    // Single-statement delete: Slice 5's reservations schema attaches ON DELETE CASCADE here (spec §7 "same operation").
    await transaction.delete(wishes).where(eq(wishes.id, input.wishId));
  });
}
