import type { Database } from "@idkdo/db";
import {
  apiErrorResponseSchema,
  createReservationResponseSchema,
  participantIdHeaderName,
  participantIdHeaderSchema,
  wishRouteParamsSchema,
} from "@idkdo/shared";
import { type FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createReservation } from "./create-reservation.js";

export type ReservationsRouteOptions = {
  readonly db: Database;
};

export const reservationsRoute: FastifyPluginAsyncZod<
  ReservationsRouteOptions
> = async (app, options) => {
  app.post(
    "/wishes/:wishId/reservation",
    {
      schema: {
        headers: participantIdHeaderSchema,
        params: wishRouteParamsSchema,
        response: {
          201: createReservationResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const reservation = await createReservation(options.db, {
        actorParticipantId: request.headers[participantIdHeaderName],
        wishId: request.params.wishId,
      });

      await reply.status(201).send(reservation);
    },
  );
};
