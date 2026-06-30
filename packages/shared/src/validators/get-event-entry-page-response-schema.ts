import { z } from "zod";

import { participantSummarySchema } from "./participant-summary-schema.js";

export const getEventEntryPageResponseSchema = z
  .object({
    createdAt: z.string().datetime(),
    id: z.string().uuid(),
    name: z.string(),
    participants: z.array(participantSummarySchema),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type GetEventEntryPageResponse = z.infer<
  typeof getEventEntryPageResponseSchema
>;
