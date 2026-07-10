import { wishes, type Database } from "@idkdo/db";
import type { EventWish, GetEventWishesResponse } from "@idkdo/shared";
import { asc, eq } from "drizzle-orm";

import { NotFoundError } from "../../errors/not-found-error.js";
import { getParticipantEventId } from "../participants/get-participant-event-id.js";
import { canViewPurchaseCoordination } from "./can-view-purchase-coordination.js";

export type GetEventWishesInput = {
  readonly eventId: string;
  readonly viewerParticipantId: string;
};

export async function getEventWishes(
  db: Database,
  input: GetEventWishesInput,
): Promise<GetEventWishesResponse> {
  const viewerEventId = await getParticipantEventId(
    db,
    input.viewerParticipantId,
  );

  if (viewerEventId === null || viewerEventId !== input.eventId) {
    throw new NotFoundError();
  }

  const wishRows = await db
    .select()
    .from(wishes)
    .where(eq(wishes.eventId, input.eventId))
    .orderBy(asc(wishes.createdAt), asc(wishes.id));

  return {
    wishes: wishRows.map((row): EventWish => {
      const wish = {
        content: row.content,
        createdAt: row.createdAt.toISOString(),
        eventId: row.eventId,
        id: row.id,
        updatedAt: row.updatedAt.toISOString(),
        wisherId: row.wisherId,
      };

      if (
        canViewPurchaseCoordination(
          input.viewerParticipantId,
          row.wisherId,
        )
      ) {
        return {
          ...wish,
          purchaseCoordination: { kind: "visible", reservation: null },
        };
      }

      return {
        ...wish,
        purchaseCoordination: { kind: "hidden" },
      };
    }),
  };
}
