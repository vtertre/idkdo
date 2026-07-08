import { healthResponseSchema, type HealthResponse } from "@idkdo/shared";
import type { FastifyPluginCallback } from "fastify";

export function getHealthResponse(): HealthResponse {
  return {
    service: "idkdo-api",
    status: "ok",
  };
}

export const healthRoute: FastifyPluginCallback = (app) => {
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
