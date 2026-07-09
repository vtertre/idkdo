import { z } from "zod";

import { wishSummarySchema } from "./wish-summary-schema.js";

export const updateWishResponseSchema = wishSummarySchema;

export type UpdateWishResponse = z.infer<typeof updateWishResponseSchema>;
