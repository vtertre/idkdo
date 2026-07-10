import { z } from "zod";

import { purchaseCoordinationSchema } from "./purchase-coordination-schema.js";

export const eventWishSchema = z
  .object({
    content: z.string().min(1),
    createdAt: z.string().datetime(),
    eventId: z.string().uuid(),
    id: z.string().uuid(),
    purchaseCoordination: purchaseCoordinationSchema,
    updatedAt: z.string().datetime(),
    wisherId: z.string().uuid(),
  })
  .strict();

export type EventWish = z.infer<typeof eventWishSchema>;
