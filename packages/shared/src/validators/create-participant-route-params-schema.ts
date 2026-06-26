import { z } from "zod";

export const createParticipantRouteParamsSchema = z
  .object({
    eventId: z
      .string()
      .uuid()
      .regex(/^(?!00000000-0000-0000-0000-000000000000$).+$/i),
  })
  .strict();

export type CreateParticipantRouteParams = z.infer<
  typeof createParticipantRouteParamsSchema
>;
