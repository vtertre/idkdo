import {
  apiErrorResponseSchema,
  type CreateParticipantRequestBody,
  createParticipantRequestBodySchema,
  createParticipantResponseSchema,
  createParticipantRouteParamsSchema,
  type CreateParticipantRouteParams,
  type CreateEventRequestBody,
  createEventRequestBodySchema,
  createEventResponseSchema,
  getEventEntryPageResponseSchema,
  getEventEntryPageRouteParamsSchema,
  type GetEventEntryPageRouteParams,
} from "@idkdo/shared";
import type { FastifyInstance } from "fastify";
import type { EventResource } from "../resources/event-resource.js";

export type EventsRouteOptions = {
  readonly eventResource: EventResource;
};

// eslint-disable-next-line @typescript-eslint/require-await -- Fastify async plugins may only register routes.
export async function eventsRoute(
  app: FastifyInstance,
  options: EventsRouteOptions,
): Promise<void> {
  app.get<{ Params: GetEventEntryPageRouteParams }>(
    "/events/:eventId",
    {
      schema: {
        params: getEventEntryPageRouteParamsSchema,
        response: {
          200: getEventEntryPageResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => options.eventResource.getEventEntryPage(request, reply),
  );

  app.post<{
    Body: CreateParticipantRequestBody;
    Params: CreateParticipantRouteParams;
  }>(
    "/events/:eventId/participants",
    {
      schema: {
        body: createParticipantRequestBodySchema,
        params: createParticipantRouteParamsSchema,
        response: {
          201: createParticipantResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => options.eventResource.createParticipant(request, reply),
  );

  app.post<{ Body: CreateEventRequestBody }>(
    "/events",
    {
      schema: {
        body: createEventRequestBodySchema,
        response: {
          201: createEventResponseSchema,
          400: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => options.eventResource.createEvent(request, reply),
  );
}
