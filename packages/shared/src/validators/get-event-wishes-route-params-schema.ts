import { z } from "zod";

export const getEventWishesRouteParamsSchema = z
  .object({
    eventId: z.string().uuid(),
  })
  .strict();

export type GetEventWishesRouteParams = z.infer<
  typeof getEventWishesRouteParamsSchema
>;
