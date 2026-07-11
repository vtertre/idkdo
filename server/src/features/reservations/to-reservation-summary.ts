import {
  reservationContributors,
  reservations,
} from "@idkdo/db";
import type { ReservationSummary } from "@idkdo/shared";

type ReservationRow = typeof reservations.$inferSelect;
type ContributorRow = Pick<
  typeof reservationContributors.$inferSelect,
  "createdAt" | "participantId"
>;

export function toReservationSummary(
  reservation: ReservationRow,
  contributors: readonly ContributorRow[],
): ReservationSummary {
  return {
    contributors: contributors
      .map((contributor) => ({
        createdAt: contributor.createdAt.toISOString(),
        participantId: contributor.participantId,
      }))
      .sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) ||
          left.participantId.localeCompare(right.participantId),
      ),
    createdAt: reservation.createdAt.toISOString(),
    id: reservation.id,
    updatedAt: reservation.updatedAt.toISOString(),
    wishId: reservation.wishId,
  };
}
