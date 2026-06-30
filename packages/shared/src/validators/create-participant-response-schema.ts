import { z } from "zod";

import { participantSummarySchema } from "./participant-summary-schema.js";

export const createParticipantResponseSchema = participantSummarySchema;

export type CreateParticipantResponse = z.infer<
  typeof createParticipantResponseSchema
>;
