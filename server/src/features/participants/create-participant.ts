import { randomUUID } from "node:crypto";

import { events, participants, type Database } from "@idkdo/db";
import type { ParticipantSummary } from "@idkdo/shared";
import { eq } from "drizzle-orm";

import { EventNotFoundError } from "./errors/event-not-found-error.js";
import { ParticipantNameAlreadyExistsError } from "./errors/participant-name-already-exists-error.js";

export type CreateParticipantInput = {
  readonly eventId: string;
  readonly name: string;
};

export async function createParticipant(
  db: Database,
  input: CreateParticipantInput,
): Promise<ParticipantSummary> {
  return db.transaction(async (transaction) => {
    const eventRows = await transaction
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, input.eventId))
      .limit(1);

    if (eventRows.length === 0) {
      throw new EventNotFoundError(input.eventId);
    }

    let participant: ParticipantRow | undefined;

    try {
      const insertedRows = await transaction
        .insert(participants)
        .values({
          eventId: input.eventId,
          id: randomUUID(),
          name: input.name,
        })
        .returning();
      participant = insertedRows[0];
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ParticipantNameAlreadyExistsError();
      }

      throw error;
    }

    if (!participant) {
      throw new Error("Participant insert did not return a row.");
    }

    await transaction
      .update(events)
      .set({ updatedAt: new Date() })
      .where(eq(events.id, input.eventId));

    return toParticipantSummary(participant);
  });
}

type ParticipantRow = typeof participants.$inferSelect;

function toParticipantSummary(row: ParticipantRow): ParticipantSummary {
  return {
    createdAt: row.createdAt.toISOString(),
    eventId: row.eventId,
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
  };
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
