import { z } from "zod";

export const createWishRequestBodySchema = z
  .object({
    content: z.string().trim().min(1),
  })
  .strict();

export type CreateWishRequestBody = z.infer<
  typeof createWishRequestBodySchema
>;
