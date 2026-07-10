import { z } from "zod";

import { reservationContributorSummarySchema } from "./reservation-contributor-summary-schema.js";

export const reservationSummarySchema = z
  .object({
    contributors: z.array(reservationContributorSummarySchema).min(1),
    createdAt: z.string().datetime(),
    id: z.string().uuid(),
    updatedAt: z.string().datetime(),
    wishId: z.string().uuid(),
  })
  .strict();

export type ReservationSummary = z.infer<typeof reservationSummarySchema>;
