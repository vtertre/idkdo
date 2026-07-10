import { z } from "zod";

import { eventWishSchema } from "./event-wish-schema.js";

export const getEventWishesResponseSchema = z
  .object({
    wishes: z.array(eventWishSchema),
  })
  .strict();

export type GetEventWishesResponse = z.infer<
  typeof getEventWishesResponseSchema
>;
