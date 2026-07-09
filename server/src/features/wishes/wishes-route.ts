import type { Database } from "@idkdo/db";
import {
  apiErrorResponseSchema,
  createWishRequestBodySchema,
  createWishResponseSchema,
  getParticipantWishesResponseSchema,
  participantIdHeaderName,
  participantIdHeaderSchema,
  participantWishesRouteParamsSchema,
  updateWishRequestBodySchema,
  updateWishResponseSchema,
  wishRouteParamsSchema,
} from "@idkdo/shared";
import { type FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { createWish } from "./create-wish.js";
import { deleteWish } from "./delete-wish.js";
import { getParticipantWishes } from "./get-participant-wishes.js";
import { updateWish } from "./update-wish.js";

export type WishesRouteOptions = {
  readonly db: Database;
};

export const wishesRoute: FastifyPluginAsyncZod<WishesRouteOptions> = async (
  app,
  options,
) => {
  app.post(
    "/participants/:participantId/wishes",
    {
      schema: {
        body: createWishRequestBodySchema,
        headers: participantIdHeaderSchema,
        params: participantWishesRouteParamsSchema,
        response: {
          201: createWishResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const wish = await createWish(options.db, {
        actorParticipantId: request.headers[participantIdHeaderName],
        content: request.body.content,
        wisherId: request.params.participantId,
      });

      await reply.status(201).send(wish);
    },
  );

  app.get(
    "/participants/:participantId/wishes",
    {
      schema: {
        headers: participantIdHeaderSchema,
        params: participantWishesRouteParamsSchema,
        response: {
          200: getParticipantWishesResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const response = await getParticipantWishes(options.db, {
        participantId: request.params.participantId,
        viewerParticipantId: request.headers[participantIdHeaderName],
      });

      await reply.send(response);
    },
  );

  app.patch(
    "/wishes/:wishId",
    {
      schema: {
        body: updateWishRequestBodySchema,
        headers: participantIdHeaderSchema,
        params: wishRouteParamsSchema,
        response: {
          200: updateWishResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const wish = await updateWish(options.db, {
        actorParticipantId: request.headers[participantIdHeaderName],
        content: request.body.content,
        wishId: request.params.wishId,
      });

      await reply.send(wish);
    },
  );

  app.delete(
    "/wishes/:wishId",
    {
      schema: {
        headers: participantIdHeaderSchema,
        params: wishRouteParamsSchema,
        response: {
          204: z.undefined(),
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await deleteWish(options.db, {
        actorParticipantId: request.headers[participantIdHeaderName],
        wishId: request.params.wishId,
      });

      await reply.status(204).send();
    },
  );
};
