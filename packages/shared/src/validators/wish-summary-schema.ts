import { z } from "zod";

export const wishSummarySchema = z
  .object({
    content: z.string().min(1),
    createdAt: z.string().datetime(),
    eventId: z.string().uuid(),
    id: z.string().uuid(),
    updatedAt: z.string().datetime(),
    wisherId: z.string().uuid(),
  })
  .strict();

export type WishSummary = z.infer<typeof wishSummarySchema>;
