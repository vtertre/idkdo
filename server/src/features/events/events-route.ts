import type { Database } from "@idkdo/db";
import {
  apiErrorResponseSchema,
  createParticipantRequestBodySchema,
  createParticipantResponseSchema,
  createParticipantRouteParamsSchema,
  createEventRequestBodySchema,
  createEventResponseSchema,
  getEventEntryPageResponseSchema,
  getEventEntryPageRouteParamsSchema,
} from "@idkdo/shared";
import { type FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createParticipant } from "../participants/create-participant.js";
import { createEvent } from "./create-event.js";
import { getEventEntryPage } from "./get-event-entry-page.js";

export type EventsRouteOptions = {
  readonly db: Database;
};

export const eventsRoute: FastifyPluginAsyncZod<EventsRouteOptions> = async (
  app,
  options,
) => {
  app.get(
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
    async (request, reply) => {
      const eventEntryPage = await getEventEntryPage(options.db, {
        eventId: request.params.eventId,
      });

      if (!eventEntryPage) {
        await reply.status(404).send({
          error: {
            code: "EVENT_NOT_FOUND",
            message: "Event not found.",
          },
        });

        return;
      }

      await reply.send(eventEntryPage);
    },
  );

  app.post(
    "/events/:eventId/participants",
    {
      schema: {
        body: createParticipantRequestBodySchema,
        params: createParticipantRouteParamsSchema,
        response: {
          201: createParticipantResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const response = await createParticipant(options.db, {
        eventId: request.params.eventId,
        name: request.body.name,
      });

      await reply.status(201).send(response);
    },
  );

  app.post(
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
    async (request, reply) => {
      const response = await createEvent(options.db, request.body);

      await reply.status(201).send(response);
    },
  );
};
