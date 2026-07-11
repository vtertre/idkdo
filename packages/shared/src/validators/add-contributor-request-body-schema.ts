import { z } from "zod";

export const addContributorRequestBodySchema = z
  .object({
    participantId: z.string().uuid(),
  })
  .strict();

export type AddContributorRequestBody = z.infer<
  typeof addContributorRequestBodySchema
>;
