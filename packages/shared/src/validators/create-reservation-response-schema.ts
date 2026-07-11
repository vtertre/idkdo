import { z } from "zod";

import { reservationSummarySchema } from "./reservation-summary-schema.js";

export const createReservationResponseSchema = reservationSummarySchema;

export type CreateReservationResponse = z.infer<
  typeof createReservationResponseSchema
>;
