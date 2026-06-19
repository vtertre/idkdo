import { z } from "zod";

export const getEventEntryPageRouteParamsSchema = z
  .object({
    eventId: z
      .string()
      .uuid()
      .regex(/^(?!00000000-0000-0000-0000-000000000000$).+$/i),
  })
  .strict();

export type GetEventEntryPageRouteParams = z.infer<
  typeof getEventEntryPageRouteParamsSchema
>;
