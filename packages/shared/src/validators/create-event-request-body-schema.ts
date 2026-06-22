import { z } from "zod";

export const createEventRequestBodySchema = z
  .object({
    name: z.string().trim().min(1),
  })
  .strict();

export type CreateEventRequestBody = z.infer<typeof createEventRequestBodySchema>;
