import { z } from "zod";

import { wishSummarySchema } from "./wish-summary-schema.js";

export const createWishResponseSchema = wishSummarySchema;

export type CreateWishResponse = z.infer<typeof createWishResponseSchema>;
