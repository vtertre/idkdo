import { randomUUID } from "node:crypto";

import {
  reservationContributors,
  reservations,
  wishes,
  type Database,
} from "@idkdo/db";
import type { ReservationSummary } from "@idkdo/shared";
import { eq } from "drizzle-orm";

import { NotFoundError } from "../../errors/not-found-error.js";
import { getParticipantEventId } from "../participants/get-participant-event-id.js";
import { CannotReserveOwnWishError } from "./errors/cannot-reserve-own-wish-error.js";
import { ReservationAlreadyExistsError } from "./errors/reservation-already-exists-error.js";
import { toReservationSummary } from "./to-reservation-summary.js";

export type CreateReservationInput = {
  readonly actorParticipantId: string;
  readonly wishId: string;
};

export async function createReservation(
  db: Database,
  input: CreateReservationInput,
): Promise<ReservationSummary> {
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

    if (input.actorParticipantId === wish.wisherId) {
      throw new CannotReserveOwnWishError();
    }

    const existingRows = await transaction
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.wishId, input.wishId))
      .limit(1);

    if (existingRows.length > 0) {
      throw new ReservationAlreadyExistsError();
    }

    let reservation: typeof reservations.$inferSelect | undefined;

    try {
      const insertedRows = await transaction
        .insert(reservations)
        .values({ id: randomUUID(), wishId: input.wishId })
        .returning();
      reservation = insertedRows[0];
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ReservationAlreadyExistsError();
      }

      throw error;
    }

    if (!reservation) {
      throw new Error("Reservation insert did not return a row.");
    }

    const contributorRows = await transaction
      .insert(reservationContributors)
      .values({
        id: randomUUID(),
        participantId: input.actorParticipantId,
        reservationId: reservation.id,
      })
      .returning();
    const contributor = contributorRows[0];

    if (!contributor) {
      throw new Error("Reservation contributor insert did not return a row.");
    }

    return toReservationSummary(reservation, [contributor]);
  });
}

function isUniqueViolation(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return error["code"] === "23505" || isUniqueViolation(error["cause"]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
