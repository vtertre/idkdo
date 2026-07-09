import { healthResponseSchema, type HealthResponse } from "@idkdo/shared";
import { type FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export function getHealthResponse(): HealthResponse {
  return {
    service: "idkdo-api",
    status: "ok",
  };
}

export const healthRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    (): HealthResponse => getHealthResponse(),
  );
};
