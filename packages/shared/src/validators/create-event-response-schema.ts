import { z } from "zod";

export const createEventResponseSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export type CreateEventResponse = z.infer<typeof createEventResponseSchema>;
