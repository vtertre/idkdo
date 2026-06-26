import type { ParticipantSummary } from "@idkdo/shared";
import type { Temporal } from "@js-temporal/polyfill";

import type { Participant } from "../../domain/entities/participant.js";

export function participantToSummary(participant: Participant): ParticipantSummary {
  return {
    createdAt: instantToIsoString(participant.createdAt),
    eventId: participant.eventId.toString(),
    id: participant.id.toString(),
    name: participant.name.value,
    updatedAt: instantToIsoString(participant.updatedAt),
  };
}

function instantToIsoString(instant: Temporal.Instant): string {
  return new Date(instant.epochMilliseconds).toISOString();
}
