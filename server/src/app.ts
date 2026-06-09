import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

import type { ServerEnvironment } from "./configuration/environment.js";
import { registerHealthRoute } from "./presentation/http/routes/health-route.js";

export type BuildAppOptions = {
  environment: ServerEnvironment;
};

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify(buildFastifyOptions(options.environment));

  registerHealthRoute(app);

  return app;
}

function buildFastifyOptions(environment: ServerEnvironment): FastifyServerOptions {
  return {
    logger: environment.nodeEnv === "test" ? false : { level: environment.logLevel },
    trustProxy: environment.nodeEnv === "production",
  };
}
