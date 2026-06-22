import type { FastifySerializerCompiler } from "fastify";
import type { z } from "zod";

export const zodSerializerCompiler: FastifySerializerCompiler<z.ZodType> =
  ({ schema }) =>
  (value): string => {
    const result = schema.safeParse(value);

    if (!result.success) {
      throw result.error;
    }

    return JSON.stringify(result.data);
  };
