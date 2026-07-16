import {
  reservationContributors,
  reservations,
  type Database,
} from "@idkdo/db";
import type { ReservationSummary } from "@idkdo/shared";
import { and, count, eq } from "drizzle-orm";

import { NotFoundError } from "../../errors/not-found-error.js";
import { loadReservationForActor } from "./load-reservation-for-actor.js";
import { toReservationSummary } from "./to-reservation-summary.js";

export type RemoveContributorInput = {
  readonly actorParticipantId: string;
  readonly participantId: string;
  readonly reservationId: string;
};

export async function removeContributor(
  db: Database,
  input: RemoveContributorInput,
): Promise<ReservationSummary | null> {
  return db.transaction(async (transaction) => {
    const { reservation } = await loadReservationForActor(transaction, input);

    const deletedRows = await transaction
      .delete(reservationContributors)
      .where(
        and(
          eq(reservationContributors.reservationId, input.reservationId),
          eq(reservationContributors.participantId, input.participantId),
        ),
      )
      .returning({ id: reservationContributors.id });

    if (deletedRows.length === 0) {
      throw new NotFoundError();
    }

    const remainingCountRows = await transaction
      .select({ value: count() })
      .from(reservationContributors)
      .where(eq(reservationContributors.reservationId, input.reservationId));
    const remainingCount = remainingCountRows[0]?.value ?? 0;

    if (remainingCount === 0) {
      await transaction
        .delete(reservations)
        .where(eq(reservations.id, input.reservationId));

      return null;
    }

    const updatedRows = await transaction
      .update(reservations)
      .set({ updatedAt: new Date() })
      .where(eq(reservations.id, input.reservationId))
      .returning();
    const updatedReservation = updatedRows[0];

    if (!updatedReservation) {
      throw new Error("Reservation update did not return a row.");
    }

    const contributorRows = await transaction
      .select()
      .from(reservationContributors)
      .where(eq(reservationContributors.reservationId, reservation.id));

    return toReservationSummary(updatedReservation, contributorRows);
  });
}
