import { randomUUID } from "node:crypto";

import {
  reservationContributors,
  reservations,
  type Database,
} from "@idkdo/db";
import type { ReservationSummary } from "@idkdo/shared";
import { and, eq } from "drizzle-orm";

import { NotFoundError } from "../../errors/not-found-error.js";
import { getParticipantEventId } from "../participants/get-participant-event-id.js";
import { CannotAddWisherAsContributorError } from "./errors/cannot-add-wisher-as-contributor-error.js";
import { ContributorAlreadyExistsError } from "./errors/contributor-already-exists-error.js";
import { loadReservationForActor } from "./load-reservation-for-actor.js";
import { toReservationSummary } from "./to-reservation-summary.js";

export type AddContributorInput = {
  readonly actorParticipantId: string;
  readonly participantId: string;
  readonly reservationId: string;
};

export async function addContributor(
  db: Database,
  input: AddContributorInput,
): Promise<ReservationSummary> {
  return db.transaction(async (transaction) => {
    const { reservation, wish } = await loadReservationForActor(
      transaction,
      input,
    );

    const targetEventId = await getParticipantEventId(
      transaction,
      input.participantId,
    );

    if (targetEventId === null || targetEventId !== wish.eventId) {
      throw new NotFoundError();
    }

    if (input.participantId === wish.wisherId) {
      throw new CannotAddWisherAsContributorError();
    }

    const existingRows = await transaction
      .select({ id: reservationContributors.id })
      .from(reservationContributors)
      .where(
        and(
          eq(reservationContributors.reservationId, input.reservationId),
          eq(reservationContributors.participantId, input.participantId),
        ),
      )
      .limit(1);

    if (existingRows.length > 0) {
      throw new ContributorAlreadyExistsError();
    }

    try {
      await transaction.insert(reservationContributors).values({
        id: randomUUID(),
        participantId: input.participantId,
        reservationId: input.reservationId,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ContributorAlreadyExistsError();
      }

      throw error;
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

function isUniqueViolation(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return error["code"] === "23505" || isUniqueViolation(error["cause"]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
