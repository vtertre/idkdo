import { Uuid } from "@idkdo/patterns";
import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { ParticipantName } from "../value-objects/participant-name.js";
import { Participant } from "./participant.js";

describe("Participant", () => {
  it("creates a Participant scoped to an Event", () => {
    const eventId = Uuid.random();
    const now = Temporal.Instant.from("2026-06-26T10:00:00Z");
    const participant = Participant.create({
      eventId,
      name: ParticipantName.create("Alice"),
      now,
    });

    expect(participant.eventId.equals(eventId)).toBe(true);
    expect(participant.name.value).toBe("Alice");
    expect(participant.createdAt.equals(now)).toBe(true);
    expect(participant.updatedAt.equals(now)).toBe(true);
  });

  it("rehydrates persisted Participant state", () => {
    const eventId = Uuid.random();
    const participantId = Uuid.random();
    const createdAt = Temporal.Instant.from("2026-06-26T10:00:00Z");
    const updatedAt = Temporal.Instant.from("2026-06-26T10:05:00Z");
    const participant = Participant.rehydrate({
      createdAt,
      eventId,
      id: participantId,
      name: ParticipantName.create("Alice"),
      updatedAt,
    });

    expect(participant.id.equals(participantId)).toBe(true);
    expect(participant.eventId.equals(eventId)).toBe(true);
    expect(participant.updatedAt.equals(updatedAt)).toBe(true);
  });
});
