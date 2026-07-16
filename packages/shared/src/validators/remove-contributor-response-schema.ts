import { z } from "zod";

import { reservationSummarySchema } from "./reservation-summary-schema.js";

export const removeContributorResponseSchema = z
  .object({
    reservation: reservationSummarySchema.nullable(),
  })
  .strict();

export type RemoveContributorResponse = z.infer<
  typeof removeContributorResponseSchema
>;
