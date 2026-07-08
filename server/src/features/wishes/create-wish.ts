import { randomUUID } from "node:crypto";

import { wishes, type Database } from "@idkdo/db";
import type { WishSummary } from "@idkdo/shared";

import { NotFoundError } from "../../errors/not-found-error.js";
import { getParticipantEventId } from "../participants/get-participant-event-id.js";
import { CannotCreateWishForAnotherParticipantError } from "./errors/cannot-create-wish-for-another-participant-error.js";

export type CreateWishInput = {
  readonly actorParticipantId: string;
  readonly content: string;
  readonly wisherId: string;
};

export async function createWish(
  db: Database,
  input: CreateWishInput,
): Promise<WishSummary> {
  return db.transaction(async (transaction) => {
    const wisherEventId = await getParticipantEventId(transaction, input.wisherId);

    if (wisherEventId === null) {
      throw new NotFoundError();
    }

    const actorEventId = await getParticipantEventId(
      transaction,
      input.actorParticipantId,
    );

    if (actorEventId === null || actorEventId !== wisherEventId) {
      throw new NotFoundError();
    }

    if (input.actorParticipantId !== input.wisherId) {
      throw new CannotCreateWishForAnotherParticipantError();
    }

    const insertedRows = await transaction
      .insert(wishes)
      .values({
        content: input.content,
        eventId: wisherEventId,
        id: randomUUID(),
        wisherId: input.wisherId,
      })
      .returning();
    const wish = insertedRows[0];

    if (!wish) {
      throw new Error("Wish insert did not return a row.");
    }

    return toWishSummary(wish);
  });
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
