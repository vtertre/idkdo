import { MissingAggregateRootError } from "@idkdo/patterns";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";

import { BlankEventNameError } from "../../../domain/errors/blank-event-name-error.js";
import { ParticipantNameAlreadyExistsError } from "../../../domain/errors/participant-name-already-exists-error.js";
import { apiErrorHandler } from "./api-error-handler.js";

describe("apiErrorHandler", () => {
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

  it("maps duplicate Participant names to 422", () => {
    const reply = new RecordingReply();

    apiErrorHandler(
      new ParticipantNameAlreadyExistsError(),
      fakeRequest(),
      reply.asFastifyReply(),
    );

    expect(reply.statusCode).toBe(422);
    expect(reply.body).toEqual({
      error: {
        code: "PARTICIPANT_NAME_ALREADY_EXISTS",
        message: "A participant with that name already exists for this event.",
      },
    });
  });

  it("maps missing aggregate roots to a common 404 response", () => {
    const reply = new RecordingReply();

    apiErrorHandler(
      new MissingAggregateRootError("event-id", "Event"),
      fakeRequest(),
      reply.asFastifyReply(),
    );

    expect(reply.statusCode).toBe(404);
    expect(reply.body).toEqual({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      },
    });
  });

  it("preserves Fastify client error status codes", () => {
    const reply = new RecordingReply();
    const request = fakeRequest();
    const error = new Error("Body is not valid JSON.") as FastifyError;
    error.code = "FST_ERR_CTP_INVALID_JSON_BODY";
    error.statusCode = 400;

    apiErrorHandler(error, request, reply.asFastifyReply());

    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({
      error: {
        code: "FST_ERR_CTP_INVALID_JSON_BODY",
        message: "Body is not valid JSON.",
      },
    });
    expect(request.log.error).not.toHaveBeenCalled();
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

describe("apiErrorHandler validation mapping", () => {
  it("maps Fastify body validation errors to 400", () => {
    const reply = new RecordingReply();
    const error = new Error("body validation failed") as FastifyError;
    error.code = "FST_ERR_VALIDATION";
    Object.assign(error, {
      validationContext: "body",
    });

    apiErrorHandler(
      error,
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

  it("maps Fastify route parameter validation errors to 400", () => {
    const reply = new RecordingReply();
    const error = new Error("params validation failed") as FastifyError;
    error.code = "FST_ERR_VALIDATION";
    Object.assign(error, {
      validationContext: "params",
    });

    apiErrorHandler(error, fakeRequest(), reply.asFastifyReply());

    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid route parameters.",
      },
    });
  });

  it("maps Fastify query validation errors to 400", () => {
    const reply = new RecordingReply();
    const error = new Error("query validation failed") as FastifyError;
    error.code = "FST_ERR_VALIDATION";
    Object.assign(error, {
      validationContext: "query",
    });

    apiErrorHandler(error, fakeRequest(), reply.asFastifyReply());

    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid query parameters.",
      },
    });
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
