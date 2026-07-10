import type { ApiErrorResponse } from "@idkdo/shared";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

import { BusinessRuleError } from "../errors/business-rule-error.js";
import { NotFoundError } from "../errors/not-found-error.js";
import { StateConflictError } from "../errors/state-conflict-error.js";

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
  const errorCode = getErrorCode(error);

  if (error instanceof BusinessRuleError) {
    return {
      body: {
        error: {
          code: errorCode,
          message: error.message,
        },
      },
      statusCode: 422,
    };
  }

  if (error instanceof StateConflictError) {
    return {
      body: {
        error: {
          code: errorCode,
          message: error.message,
        },
      },
      statusCode: 409,
    };
  }

  if (error instanceof NotFoundError) {
    return {
      body: {
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Resource not found.",
        },
      },
      statusCode: 404,
    };
  }

  const validationMessage = getFastifyValidationMessage(error);

  if (validationMessage !== undefined) {
    return {
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: validationMessage,
        },
      },
      statusCode: 400,
    };
  }

  const clientErrorStatusCode = getClientErrorStatusCode(error);

  if (clientErrorStatusCode !== undefined) {
    return {
      body: {
        error: {
          code: getErrorCode(error),
          message: getErrorMessage(error),
        },
      },
      statusCode: clientErrorStatusCode,
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

function getFastifyValidationMessage(error: unknown): string | undefined {
  if (!isRecord(error) || error["code"] !== "FST_ERR_VALIDATION") {
    return undefined;
  }

  switch (error["validationContext"]) {
    case "body":
      return "Invalid request body.";
    case "headers":
      return "Invalid request headers.";
    case "params":
      return "Invalid route parameters.";
    case "query":
    case "querystring":
      return "Invalid query parameters.";
    default:
      return "Invalid request.";
  }
}

function getClientErrorStatusCode(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const statusCode = getNumericProperty(error, "statusCode") ?? getNumericProperty(error, "status");

  if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
    return statusCode;
  }

  return undefined;
}

function getNumericProperty(
  value: Record<string, unknown>,
  propertyName: string,
): number | undefined {
  const propertyValue = value[propertyName];

  return typeof propertyValue === "number" ? propertyValue : undefined;
}

function getErrorCode(error: unknown): string {
  if (isRecord(error) && typeof error["code"] === "string") {
    return error["code"];
  }

  return "HTTP_ERROR";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "HTTP error.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
