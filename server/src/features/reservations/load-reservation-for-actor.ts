import { reservations, wishes, type Database } from "@idkdo/db";
import { eq } from "drizzle-orm";

import { NotFoundError } from "../../errors/not-found-error.js";
import { getParticipantEventId } from "../participants/get-participant-event-id.js";
import { canViewPurchaseCoordination } from "../wishes/can-view-purchase-coordination.js";

type LoadReservationForActorDatabase = Pick<Database, "select">;

export type LoadedReservationForActor = {
  readonly reservation: typeof reservations.$inferSelect;
  readonly wish: Pick<typeof wishes.$inferSelect, "eventId" | "wisherId">;
};

export async function loadReservationForActor(
  db: LoadReservationForActorDatabase,
  input: {
    readonly actorParticipantId: string;
    readonly reservationId: string;
  },
): Promise<LoadedReservationForActor> {
  const reservationRows = await db
    .select({
      reservation: reservations,
      wish: {
        eventId: wishes.eventId,
        wisherId: wishes.wisherId,
      },
    })
    .from(reservations)
    .innerJoin(wishes, eq(wishes.id, reservations.wishId))
    .where(eq(reservations.id, input.reservationId))
    .limit(1)
    // Serializes contributor mutations per reservation: without the lock, two
    // concurrent removals can each count the other's not-yet-deleted row and
    // leave a zero-contributor reservation behind.
    .for("update", { of: reservations });
  const row = reservationRows[0];

  if (!row) {
    throw new NotFoundError();
  }

  const actorEventId = await getParticipantEventId(
    db,
    input.actorParticipantId,
  );

  if (actorEventId === null || actorEventId !== row.wish.eventId) {
    throw new NotFoundError();
  }

  if (
    !canViewPurchaseCoordination(
      input.actorParticipantId,
      row.wish.wisherId,
    )
  ) {
    throw new NotFoundError();
  }

  return row;
}
