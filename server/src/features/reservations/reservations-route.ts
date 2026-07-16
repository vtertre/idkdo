import type { Database } from "@idkdo/db";
import {
  addContributorRequestBodySchema,
  addContributorResponseSchema,
  apiErrorResponseSchema,
  createReservationResponseSchema,
  participantIdHeaderName,
  participantIdHeaderSchema,
  removeContributorResponseSchema,
  reservationContributorRouteParamsSchema,
  reservationRouteParamsSchema,
  wishRouteParamsSchema,
} from "@idkdo/shared";
import { type FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { addContributor } from "./add-contributor.js";
import { createReservation } from "./create-reservation.js";
import { removeContributor } from "./remove-contributor.js";

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

  app.post(
    "/reservations/:reservationId/contributors",
    {
      schema: {
        body: addContributorRequestBodySchema,
        headers: participantIdHeaderSchema,
        params: reservationRouteParamsSchema,
        response: {
          200: addContributorResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const reservation = await addContributor(options.db, {
        actorParticipantId: request.headers[participantIdHeaderName],
        participantId: request.body.participantId,
        reservationId: request.params.reservationId,
      });

      await reply.send(reservation);
    },
  );

  app.delete(
    "/reservations/:reservationId/contributors/:participantId",
    {
      schema: {
        headers: participantIdHeaderSchema,
        params: reservationContributorRouteParamsSchema,
        response: {
          200: removeContributorResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const reservation = await removeContributor(options.db, {
        actorParticipantId: request.headers[participantIdHeaderName],
        participantId: request.params.participantId,
        reservationId: request.params.reservationId,
      });

      await reply.send({ reservation });
    },
  );
};
