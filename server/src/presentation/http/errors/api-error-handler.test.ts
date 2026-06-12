import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";

import { BlankEventNameError } from "../../../domain/errors/blank-event-name-error.js";
import { apiErrorHandler } from "./api-error-handler.js";
import { RequestValidationError } from "./request-validation-error.js";

describe("apiErrorHandler", () => {
  it("maps request validation errors to 400", () => {
    const reply = new RecordingReply();

    apiErrorHandler(
      new RequestValidationError() as FastifyError,
      fakeRequest(),
      reply.asFastifyReply(),
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request body.",
      },
    });
  });

  it("maps business rule violations to 422", () => {
    const reply = new RecordingReply();

    apiErrorHandler(
      new BlankEventNameError(),
      fakeRequest(),
      reply.asFastifyReply(),
    );

    expect(reply.statusCode).toBe(422);
    expect(reply.body).toEqual({
      error: {
        code: "BLANK_EVENT_NAME",
        message: "Event name must not be blank.",
      },
    });
  });

  it("maps unknown errors to 500 and logs them", () => {
    const reply = new RecordingReply();
    const request = fakeRequest();

    apiErrorHandler(
      new Error("database details") as FastifyError,
      request,
      reply.asFastifyReply(),
    );

    expect(reply.statusCode).toBe(500);
    expect(reply.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error.",
      },
    });
    expect(request.log.error).toHaveBeenCalledOnce();
  });
});

class RecordingReply {
  body: unknown;
  statusCode: number | undefined;

  asFastifyReply(): FastifyReply {
    return {
      send: (body: unknown) => {
        this.body = body;

        return this.asFastifyReply();
      },
      status: (statusCode: number) => {
        this.statusCode = statusCode;

        return this.asFastifyReply();
      },
    } as unknown as FastifyReply;
  }
}

function fakeRequest(): FastifyRequest {
  return {
    log: {
      error: vi.fn(),
    },
  } as unknown as FastifyRequest;
}
