import { z } from "zod";

import { wishSummarySchema } from "./wish-summary-schema.js";

export const getParticipantWishesResponseSchema = z
  .object({
    wishes: z.array(wishSummarySchema),
  })
  .strict();

export type GetParticipantWishesResponse = z.infer<
  typeof getParticipantWishesResponseSchema
>;
