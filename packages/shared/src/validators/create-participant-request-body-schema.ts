import { z } from "zod";

export const createParticipantRequestBodySchema = z
  .object({
    name: z.string().trim().min(1),
  })
  .strict();

export type CreateParticipantRequestBody = z.infer<
  typeof createParticipantRequestBodySchema
>;
