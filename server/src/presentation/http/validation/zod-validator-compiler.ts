import type { FastifySchemaCompiler, FastifySchemaValidationError } from "fastify";
import type { z } from "zod";

type ZodSafeParseResult =
  | { value: unknown }
  | { error: FastifySchemaValidationError[] };

function toValidationErrors(error: z.ZodError): FastifySchemaValidationError[] {
  return error.issues.map((issue) => ({
    instancePath: `/${issue.path.join("/")}`,
    keyword: issue.code,
    message: issue.message,
    params: {},
    schemaPath: "",
  }));
}

export const zodValidatorCompiler: FastifySchemaCompiler<z.ZodType> =
  ({ schema }) =>
  (value): ZodSafeParseResult => {
    const result = schema.safeParse(value);

    return result.success
      ? { value: result.data }
      : { error: toValidationErrors(result.error) };
  };
