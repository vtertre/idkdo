import { createDatabaseClient, type Database, type DatabaseClient } from "@idkdo/db";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

import { CreateEventCommandHandler } from "./commands/events/create-event-command-handler.js";
import { CreateEventCommand } from "./commands/events/create-event-command.js";
import { CreateParticipantCommandHandler } from "./commands/participants/create-participant-command-handler.js";
import { CreateParticipantCommand } from "./commands/participants/create-participant-command.js";
import type { ServerEnvironment } from "./configuration/environment.js";
import { AsyncCommandBus } from "./infrastructure/cqrs/async-command-bus.js";
import { AsyncQueryBus } from "./infrastructure/cqrs/async-query-bus.js";
import { EventDispatcherMiddleware } from "./infrastructure/cqrs/event-dispatcher-middleware.js";
import { StaticCommandHandlerRegistry } from "./infrastructure/cqrs/static-command-handler-registry.js";
import { StaticQueryHandlerRegistry } from "./infrastructure/cqrs/static-query-handler-registry.js";
import { EventCreated } from "./domain/events/event-created.js";
import { ParticipantCreated } from "./domain/events/participant-created.js";
import { AsyncEventBus } from "./infrastructure/event-bus/async-event-bus.js";
import { StaticDomainEventHandlerRegistry } from "./infrastructure/event-bus/static-domain-event-handler-registry.js";
import { DrizzleEventRepository } from "./infrastructure/repositories/drizzle-event-repository.js";
import { apiErrorHandler } from "./presentation/http/errors/api-error-handler.js";
import { EventResource } from "./presentation/http/resources/event-resource.js";
import { eventsRoute } from "./presentation/http/routes/events-route.js";
import { healthRoute } from "./presentation/http/routes/health-route.js";
import { zodSerializerCompiler } from "./presentation/http/validation/zod-serializer-compiler.js";
import { zodValidatorCompiler } from "./presentation/http/validation/zod-validator-compiler.js";
import { UpdateEventEntryPageOnEventCreated } from "./projections/update-event-entry-page-on-event-created.js";
import { UpdateEventEntryPageOnParticipantCreated } from "./projections/update-event-entry-page-on-participant-created.js";
import { GetEventEntryPageQueryHandler } from "./queries/events/get-event-entry-page-query-handler.js";
import { GetEventEntryPageQuery } from "./queries/events/get-event-entry-page-query.js";

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
  const eventBus = buildEventBus(databaseClient.db);
  const commandBus = buildCommandBus(databaseClient.db, eventBus);
  const queryBus = buildQueryBus(databaseClient.db);
  const eventResource = new EventResource(commandBus, queryBus);

  app.addHook("onClose", async () => {
    if (ownsDatabaseClient) {
      await databaseClient.close();
    }
  });

  app.register(
    async (api) => {
      await api.register(healthRoute);
      await api.register(eventsRoute, { eventResource });
    },
    { prefix: "/api" },
  );

  return app;
}

function buildCommandBus(
  database: Database,
  eventBus: AsyncEventBus,
): AsyncCommandBus {
  const eventRepository = new DrizzleEventRepository(database);
  const createEventCommandHandler = new CreateEventCommandHandler(eventRepository);
  const createParticipantCommandHandler = new CreateParticipantCommandHandler(
    eventRepository,
  );
  const commandHandlerRegistry = new StaticCommandHandlerRegistry([
    {
      commandClass: CreateEventCommand,
      handler: createEventCommandHandler,
    },
    {
      commandClass: CreateParticipantCommand,
      handler: createParticipantCommandHandler,
    },
  ]);
  const eventDispatcherMiddleware = new EventDispatcherMiddleware(eventBus);

  return new AsyncCommandBus({
    commandHandlerRegistry,
    middlewares: [eventDispatcherMiddleware],
  });
}

function buildQueryBus(database: Database): AsyncQueryBus {
  const getEventEntryPageQueryHandler = new GetEventEntryPageQueryHandler(database);
  const queryHandlerRegistry = new StaticQueryHandlerRegistry([
    {
      handler: getEventEntryPageQueryHandler,
      queryClass: GetEventEntryPageQuery,
    },
  ]);

  return new AsyncQueryBus({ queryHandlerRegistry });
}

function buildEventBus(database: Database): AsyncEventBus {
  const updateEventEntryPageOnEventCreated = new UpdateEventEntryPageOnEventCreated(
    database,
  );
  const updateEventEntryPageOnParticipantCreated =
    new UpdateEventEntryPageOnParticipantCreated(database);
  const domainEventHandlerRegistry = new StaticDomainEventHandlerRegistry([
    {
      eventClass: EventCreated,
      handler: updateEventEntryPageOnEventCreated,
    },
    {
      eventClass: ParticipantCreated,
      handler: updateEventEntryPageOnParticipantCreated,
    },
  ]);

  return new AsyncEventBus({
    domainEventHandlerRegistry,
  });
}

function buildFastifyOptions(environment: ServerEnvironment): FastifyServerOptions {
  return {
    logger: environment.nodeEnv === "test" ? false : { level: environment.logLevel },
    trustProxy: environment.nodeEnv === "production",
  };
}
