import { z } from "zod";

export const getEventEntryPageResponseSchema = z
  .object({
    createdAt: z.string().datetime(),
    id: z.string().uuid(),
    name: z.string(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type GetEventEntryPageResponse = z.infer<
  typeof getEventEntryPageResponseSchema
>;
