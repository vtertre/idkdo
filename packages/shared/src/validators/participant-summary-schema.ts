import { z } from "zod";

export const participantSummarySchema = z
  .object({
    createdAt: z.string().datetime(),
    eventId: z.string().uuid(),
    id: z.string().uuid(),
    name: z.string().trim().min(1),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type ParticipantSummary = z.infer<typeof participantSummarySchema>;
