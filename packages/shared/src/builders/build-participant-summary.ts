import type { ParticipantSummary } from "../validators/participant-summary-schema.js";

export type BuildParticipantSummaryInput = {
  readonly createdAtEpochMilliseconds: number;
  readonly eventId: string;
  readonly id: string;
  readonly name: string;
  readonly updatedAtEpochMilliseconds: number;
};

export function buildParticipantSummary(
  input: BuildParticipantSummaryInput,
): ParticipantSummary {
  return {
    createdAt: epochMillisecondsToIsoString(input.createdAtEpochMilliseconds),
    eventId: input.eventId,
    id: input.id,
    name: input.name,
    updatedAt: epochMillisecondsToIsoString(input.updatedAtEpochMilliseconds),
  };
}

function epochMillisecondsToIsoString(epochMilliseconds: number): string {
  return new Date(epochMilliseconds).toISOString();
}
