import { z } from "zod";

export const wishRouteParamsSchema = z
  .object({
    wishId: z.string().uuid(),
  })
  .strict();

export type WishRouteParams = z.infer<typeof wishRouteParamsSchema>;
