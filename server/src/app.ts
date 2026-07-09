import { createDatabaseClient, type DatabaseClient } from "@idkdo/db";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

import type { ServerEnvironment } from "./configuration/environment.js";
import { eventsRoute } from "./features/events/events-route.js";
import { wishesRoute } from "./features/wishes/wishes-route.js";
import { apiErrorHandler } from "./http/api-error-handler.js";
import { healthRoute } from "./http/health-route.js";
import { zodSerializerCompiler } from "./http/zod-serializer-compiler.js";
import { zodValidatorCompiler } from "./http/zod-validator-compiler.js";

export type BuildAppOptions = {
  databaseClient?: DatabaseClient;
  environment: ServerEnvironment;
};

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify(buildFastifyOptions(options.environment));
  app.setValidatorCompiler(zodValidatorCompiler);
  app.setSerializerCompiler(zodSerializerCompiler);
  app.setErrorHandler(apiErrorHandler);

  const databaseClient =
    options.databaseClient ??
    createDatabaseClient({ databaseUrl: options.environment.databaseUrl });
  const ownsDatabaseClient = options.databaseClient === undefined;

  app.addHook("onClose", async () => {
    if (ownsDatabaseClient) {
      await databaseClient.close();
    }
  });

  app.register(
    async (api) => {
      await api.register(healthRoute);
      await api.register(eventsRoute, { db: databaseClient.db });
      await api.register(wishesRoute, { db: databaseClient.db });
    },
    { prefix: "/api" },
  );

  return app;
}

function buildFastifyOptions(environment: ServerEnvironment): FastifyServerOptions {
  return {
    logger: environment.nodeEnv === "test" ? false : { level: environment.logLevel },
    trustProxy: environment.nodeEnv === "production",
  };
}
