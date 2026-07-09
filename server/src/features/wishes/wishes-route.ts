import type { Database } from "@idkdo/db";
import {
  apiErrorResponseSchema,
  type CreateWishRequestBody,
  createWishRequestBodySchema,
  createWishResponseSchema,
  type GetParticipantWishesResponse,
  getParticipantWishesResponseSchema,
  type ParticipantIdHeader,
  participantIdHeaderName,
  participantIdHeaderSchema,
  type ParticipantWishesRouteParams,
  participantWishesRouteParamsSchema,
  type UpdateWishRequestBody,
  updateWishRequestBodySchema,
  updateWishResponseSchema,
  type WishRouteParams,
  wishRouteParamsSchema,
} from "@idkdo/shared";
import type { FastifyInstance } from "fastify";

import { createWish } from "./create-wish.js";
import { deleteWish } from "./delete-wish.js";
import { getParticipantWishes } from "./get-participant-wishes.js";
import { updateWish } from "./update-wish.js";

export type WishesRouteOptions = {
  readonly db: Database;
};

// eslint-disable-next-line @typescript-eslint/require-await -- Fastify async plugins may only register routes.
export async function wishesRoute(
  app: FastifyInstance,
  options: WishesRouteOptions,
): Promise<void> {
  registerCreateWishRoute(app, options);
  registerGetParticipantWishesRoute(app, options);
  registerUpdateWishRoute(app, options);
  registerDeleteWishRoute(app, options);
}

function registerCreateWishRoute(
  app: FastifyInstance,
  options: WishesRouteOptions,
): void {
  app.post<{
    Body: CreateWishRequestBody;
    Headers: ParticipantIdHeader;
    Params: ParticipantWishesRouteParams;
  }>(
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
}

function registerGetParticipantWishesRoute(
  app: FastifyInstance,
  options: WishesRouteOptions,
): void {
  app.get<{
    Headers: ParticipantIdHeader;
    Params: ParticipantWishesRouteParams;
    Reply: GetParticipantWishesResponse;
  }>(
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
}

function registerUpdateWishRoute(
  app: FastifyInstance,
  options: WishesRouteOptions,
): void {
  app.patch<{
    Body: UpdateWishRequestBody;
    Headers: ParticipantIdHeader;
    Params: WishRouteParams;
  }>(
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
}

function registerDeleteWishRoute(
  app: FastifyInstance,
  options: WishesRouteOptions,
): void {
  app.delete<{
    Headers: ParticipantIdHeader;
    Params: WishRouteParams;
  }>(
    "/wishes/:wishId",
    {
      schema: {
        headers: participantIdHeaderSchema,
        params: wishRouteParamsSchema,
        response: {
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
}
