import { z } from "zod";

export const reservationContributorSummarySchema = z
  .object({
    createdAt: z.string().datetime(),
    participantId: z.string().uuid(),
  })
  .strict();

export type ReservationContributorSummary = z.infer<
  typeof reservationContributorSummarySchema
>;
