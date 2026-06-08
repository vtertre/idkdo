import type { FastifyInstance } from "fastify";

type HealthResponse = {
  service: "idkdo-api";
  status: "ok";
};

const healthResponseSchema = {
  additionalProperties: false,
  properties: {
    service: { const: "idkdo-api", type: "string" },
    status: { const: "ok", type: "string" },
  },
  required: ["service", "status"],
  type: "object",
} as const;

export function getHealthResponse(): HealthResponse {
  return {
    service: "idkdo-api",
    status: "ok",
  };
}

export function registerHealthRoute(app: FastifyInstance): void {
  app.get(
    "/api/health",
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    (): HealthResponse => getHealthResponse(),
  );
}
