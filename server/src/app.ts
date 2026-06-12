import { createDatabaseClient, type Database, type DatabaseClient } from "@idkdo/db";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

import { CreateEventCommandHandler } from "./commands/events/create-event-command-handler.js";
import { CreateEventCommand } from "./commands/events/create-event-command.js";
import type { ServerEnvironment } from "./configuration/environment.js";
import { EventDispatcherMiddleware } from "./infrastructure/cqrs/event-dispatcher-middleware.js";
import { AsyncCommandBus } from "./infrastructure/cqrs/async-command-bus.js";
import { StaticCommandHandlerRegistry } from "./infrastructure/cqrs/static-command-handler-registry.js";
import { NoopEventBus } from "./infrastructure/event-bus/noop-event-bus.js";
import { DrizzleEventRepository } from "./infrastructure/repositories/drizzle-event-repository.js";
import { apiErrorHandler } from "./presentation/http/errors/api-error-handler.js";
import { EventResource } from "./presentation/http/resources/event-resource.js";
import { eventsRoute } from "./presentation/http/routes/events-route.js";
import { healthRoute } from "./presentation/http/routes/health-route.js";

export type BuildAppOptions = {
  databaseClient?: DatabaseClient;
  environment: ServerEnvironment;
};

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify(buildFastifyOptions(options.environment));
  app.setErrorHandler(apiErrorHandler);

  const databaseClient =
    options.databaseClient ??
    createDatabaseClient({ databaseUrl: options.environment.databaseUrl });
  const ownsDatabaseClient = options.databaseClient === undefined;
  const commandBus = buildCommandBus(databaseClient.db);
  const eventResource = new EventResource(commandBus);

  if (ownsDatabaseClient) {
    app.addHook("onClose", async () => {
      await databaseClient.close();
    });
  }

  app.register(
    async (api) => {
      await api.register(healthRoute);
      await api.register(eventsRoute, { eventResource });
    },
    { prefix: "/api" },
  );

  return app;
}

function buildCommandBus(database: Database): AsyncCommandBus {
  const eventRepository = new DrizzleEventRepository(database);
  const createEventCommandHandler = new CreateEventCommandHandler(eventRepository);
  const commandHandlerRegistry = new StaticCommandHandlerRegistry([
    {
      commandClass: CreateEventCommand,
      handler: createEventCommandHandler,
    },
  ]);
  const eventDispatcherMiddleware = new EventDispatcherMiddleware(
    new NoopEventBus(),
  );

  return new AsyncCommandBus({
    commandHandlerRegistry,
    middlewares: [eventDispatcherMiddleware],
  });
}

function buildFastifyOptions(environment: ServerEnvironment): FastifyServerOptions {
  return {
    logger: environment.nodeEnv === "test" ? false : { level: environment.logLevel },
    trustProxy: environment.nodeEnv === "production",
  };
}
