import { z } from "zod";

import { reservationSummarySchema } from "./reservation-summary-schema.js";

export const purchaseCoordinationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hidden") }).strict(),
  z
    .object({
      kind: z.literal("visible"),
      reservation: reservationSummarySchema.nullable(),
    })
    .strict(),
]);

export type PurchaseCoordination = z.infer<
  typeof purchaseCoordinationSchema
>;
