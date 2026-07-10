import { z } from "zod";

export const purchaseCoordinationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hidden") }).strict(),
  z.object({ kind: z.literal("visible"), reservation: z.null() }).strict(),
]);

export type PurchaseCoordination = z.infer<
  typeof purchaseCoordinationSchema
>;
