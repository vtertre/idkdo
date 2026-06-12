import type { FastifyInstance } from "fastify";

import { apiErrorResponseSchema } from "../errors/api-error-response-schema.js";
import type { EventResource } from "../resources/event-resource.js";

export type EventsRouteOptions = {
  readonly eventResource: EventResource;
};

const createEventResponseSchema = {
  additionalProperties: false,
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
  type: "object",
} as const;

// eslint-disable-next-line @typescript-eslint/require-await -- Fastify async plugins may only register routes.
export async function eventsRoute(
  app: FastifyInstance,
  options: EventsRouteOptions,
): Promise<void> {
  app.post(
    "/events",
    {
      schema: {
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
