import {
  reservationContributors,
  reservations,
  wishes,
  type Database,
} from "@idkdo/db";
import type {
  EventWish,
  GetEventWishesResponse,
  ReservationSummary,
} from "@idkdo/shared";
import { and, asc, eq } from "drizzle-orm";

import { NotFoundError } from "../../errors/not-found-error.js";
import { getParticipantEventId } from "../participants/get-participant-event-id.js";
import { toReservationSummary } from "../reservations/to-reservation-summary.js";
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

  const coordinationRows = await db
    .select({
      contributor: {
        createdAt: reservationContributors.createdAt,
        participantId: reservationContributors.participantId,
      },
      reservation: reservations,
    })
    .from(reservations)
    .innerJoin(
      wishes,
      and(
        eq(wishes.id, reservations.wishId),
        eq(wishes.eventId, input.eventId),
      ),
    )
    .innerJoin(
      reservationContributors,
      eq(reservationContributors.reservationId, reservations.id),
    );
  const reservationGroups = new Map<
    string,
    {
      contributors: (typeof coordinationRows)[number]["contributor"][];
      reservation: (typeof coordinationRows)[number]["reservation"];
    }
  >();

  for (const row of coordinationRows) {
    const group = reservationGroups.get(row.reservation.id) ?? {
      contributors: [],
      reservation: row.reservation,
    };
    group.contributors.push(row.contributor);
    reservationGroups.set(row.reservation.id, group);
  }

  const reservationsByWishId = new Map<string, ReservationSummary>();
  for (const group of reservationGroups.values()) {
    reservationsByWishId.set(
      group.reservation.wishId,
      toReservationSummary(group.reservation, group.contributors),
    );
  }

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
          purchaseCoordination: {
            kind: "visible",
            reservation: reservationsByWishId.get(row.id) ?? null,
          },
        };
      }

      return {
        ...wish,
        purchaseCoordination: { kind: "hidden" },
      };
    }),
  };
}
