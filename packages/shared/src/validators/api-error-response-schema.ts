import { z } from "zod";

export const apiErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
      })
      .strict(),
  })
  .strict();

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
