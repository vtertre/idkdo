import type { z } from "zod";

import { RequestValidationError } from "../errors/request-validation-error.js";

export function parseRequestBody<TSchema extends z.ZodType>(
  schema: TSchema,
  body: unknown,
): z.infer<TSchema> {
  const parsedBody = schema.safeParse(body);

  if (!parsedBody.success) {
    throw new RequestValidationError();
  }

  return parsedBody.data;
}
