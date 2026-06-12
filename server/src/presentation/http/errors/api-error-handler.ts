import { BusinessRuleViolation } from "@idkdo/patterns";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

import { RequestValidationError } from "./request-validation-error.js";

type ApiErrorResponse = {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
};

type HttpErrorResponse = {
  readonly body: ApiErrorResponse;
  readonly statusCode: number;
};

export function apiErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const response = mapErrorToHttpResponse(error);

  if (response.statusCode === 500) {
    request.log.error({ err: error }, "unhandled request error");
  }

  reply.status(response.statusCode).send(response.body);
}

function mapErrorToHttpResponse(error: unknown): HttpErrorResponse {
  if (error instanceof RequestValidationError) {
    return {
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body.",
        },
      },
      statusCode: 400,
    };
  }

  if (error instanceof BusinessRuleViolation) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      statusCode: 422,
    };
  }

  return {
    body: {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error.",
      },
    },
    statusCode: 500,
  };
}
