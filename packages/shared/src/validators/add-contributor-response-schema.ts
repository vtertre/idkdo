import { z } from "zod";

import { reservationSummarySchema } from "./reservation-summary-schema.js";

export const addContributorResponseSchema = reservationSummarySchema;

export type AddContributorResponse = z.infer<
  typeof addContributorResponseSchema
>;
