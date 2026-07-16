import { z } from "zod";

export const reservationRouteParamsSchema = z
  .object({
    reservationId: z.string().uuid(),
  })
  .strict();

export type ReservationRouteParams = z.infer<
  typeof reservationRouteParamsSchema
>;
