import { z } from "zod";

export const reservationContributorRouteParamsSchema = z
  .object({
    participantId: z.string().uuid(),
    reservationId: z.string().uuid(),
  })
  .strict();

export type ReservationContributorRouteParams = z.infer<
  typeof reservationContributorRouteParamsSchema
>;
