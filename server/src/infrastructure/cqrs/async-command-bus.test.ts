import {
  NoHandlerFoundError,
  type Command,
  type CommandBusMiddleware,
  type CommandHandler,
  type DomainEvent,
  Uuid,
  type commandResultType,
} from "@idkdo/patterns";
import { describe, expect, it } from "vitest";

import { CreateEventCommand } from "../../commands/events/create-event-command.js";
import { AsyncCommandBus } from "./async-command-bus.js";
import { StaticCommandHandlerRegistry } from "./static-command-handler-registry.js";

describe("AsyncCommandBus", () => {
  it("executes the command with the handler", async () => {
    const expectedEventId = Uuid.random();
    const createEventCommandHandler = new RecordingCreateEventCommandHandler(
      expectedEventId,
    );
    const commandBus = new AsyncCommandBus({
      commandHandlerRegistry: new StaticCommandHandlerRegistry([
        {
          commandClass: CreateEventCommand,
          handler: createEventCommandHandler,
        },
      ]),
    });
    const command = new CreateEventCommand("Christmas 2026");

    const result = await commandBus.execute(command);

    expect(result.equals(expectedEventId)).toBe(true);
    expect(createEventCommandHandler.handledCommand).toBe(command);
  });

  it("chains middleware in constructor order", async () => {
    const calls: string[] = [];
    const commandBus = new AsyncCommandBus({
      commandHandlerRegistry: new StaticCommandHandlerRegistry([
        {
          commandClass: CreateEventCommand,
          handler: new RecordingCreateEventCommandHandler(Uuid.random()),
        },
      ]),
      middlewares: [
        new OrderedCommandBusMiddleware("first", calls),
        new OrderedCommandBusMiddleware("second", calls),
      ],
    });

    await commandBus.execute(new CreateEventCommand("Christmas 2026"));

    expect(calls).toEqual([
      "first:before",
      "second:before",
      "second:after",
      "first:after",
    ]);
  });

  it("throws when no handler is registered for a command", async () => {
    const commandBus = new AsyncCommandBus({
      commandHandlerRegistry: new StaticCommandHandlerRegistry([]),
    });

    await expect(commandBus.execute(new UnknownCommand())).rejects.toThrow(
      NoHandlerFoundError,
    );
  });
});

class RecordingCreateEventCommandHandler
  implements CommandHandler<CreateEventCommand, Uuid>
{
  handledCommand: CreateEventCommand | undefined;

  constructor(private readonly eventId: Uuid) {}

  execute(command: CreateEventCommand): Promise<[Uuid, []]> {
    this.handledCommand = command;

    return Promise.resolve([this.eventId, []]);
  }
}

class OrderedCommandBusMiddleware implements CommandBusMiddleware {
  constructor(
    private readonly name: string,
    private readonly calls: string[],
  ) {}

  async intercept<TResult>(
    _command: Command<TResult>,
    next: () => Promise<[TResult, DomainEvent[]]>,
  ): Promise<[TResult, DomainEvent[]]> {
    this.calls.push(`${this.name}:before`);

    const [result, domainEvents] = await next();

    this.calls.push(`${this.name}:after`);

    return [result, domainEvents];
  }
}

class UnknownCommand implements Command<{ ok: true }> {
  declare readonly [commandResultType]: { ok: true };
}
