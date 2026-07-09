import { z } from "zod";

export const participantWishesRouteParamsSchema = z
  .object({
    participantId: z.string().uuid(),
  })
  .strict();

export type ParticipantWishesRouteParams = z.infer<
  typeof participantWishesRouteParamsSchema
>;
