import {
  type Command,
  type CommandBus,
  Uuid,
} from "@idkdo/patterns";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { CreateEventCommand } from "../../../commands/events/create-event-command.js";
import { apiErrorHandler } from "../errors/api-error-handler.js";
import { EventResource } from "../resources/event-resource.js";
import { eventsRoute } from "./events-route.js";

class RecordingCommandBus implements CommandBus {
  executedCommand: Command<unknown> | undefined;

  execute<TResult>(command: Command<TResult>): Promise<TResult> {
    this.executedCommand = command;

    return Promise.resolve(
      Uuid.parse("4d343c54-376d-4f3b-874d-22ea4a3a22bb") as TResult,
    );
  }
}

describe("events route", () => {
  it("creates an Event and returns only the created id", async () => {
    const commandBus = new RecordingCommandBus();
    const app = Fastify({ logger: false });

    app.setErrorHandler(apiErrorHandler);
    await app.register(eventsRoute, { eventResource: new EventResource(commandBus) });

    const response = await app.inject({
      method: "POST",
      payload: { name: "  Christmas 2026  " },
      url: "/events",
    });

    await app.close();

    expect(response.statusCode).toBe(201);
    expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(response.body).toBe('{"id":"4d343c54-376d-4f3b-874d-22ea4a3a22bb"}');
    expect(commandBus.executedCommand).toBeInstanceOf(CreateEventCommand);

    if (!(commandBus.executedCommand instanceof CreateEventCommand)) {
      throw new Error("Expected CreateEventCommand.");
    }

    expect(commandBus.executedCommand.name).toBe("Christmas 2026");
  });

  it.each([
    ["missing name", {}],
    ["blank name", { name: "   " }],
    ["non-string name", { name: 123 }],
  ])("returns 400 for invalid request bodies: %s", async (_caseName, payload) => {
    const commandBus = new RecordingCommandBus();
    const app = Fastify({ logger: false });

    app.setErrorHandler(apiErrorHandler);
    await app.register(eventsRoute, { eventResource: new EventResource(commandBus) });

    const response = await app.inject({
      method: "POST",
      payload,
      url: "/events",
    });

    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe(
      '{"error":{"code":"VALIDATION_ERROR","message":"Invalid request body."}}',
    );
    expect(commandBus.executedCommand).toBeUndefined();
  });
});
