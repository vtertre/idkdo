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
import { InProcessCommandBus } from "./in-process-command-bus.js";
import { StaticCommandHandlerRegistry } from "./static-command-handler-registry.js";

describe("InProcessCommandBus", () => {
  it("executes the command with the handler", async () => {
    const createEventCommandHandler = new RecordingCreateEventCommandHandler();
    const commandBus = new InProcessCommandBus({
      commandHandlerRegistry: new StaticCommandHandlerRegistry([
        {
          commandClass: CreateEventCommand,
          handler: createEventCommandHandler,
        },
      ]),
    });
    const command = new CreateEventCommand("Christmas 2026");

    const result = await commandBus.execute(command);

    expect(result.toString()).toBe("9d1e5384-0933-4bbf-8f04-8160229d0486");
    expect(createEventCommandHandler.handledCommand).toBe(command);
  });

  it("chains middleware in constructor order", async () => {
    const calls: string[] = [];
    const commandBus = new InProcessCommandBus({
      commandHandlerRegistry: new StaticCommandHandlerRegistry([
        {
          commandClass: CreateEventCommand,
          handler: new RecordingCreateEventCommandHandler(),
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
    const commandBus = new InProcessCommandBus({
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
  private readonly eventId = Uuid.parse("9d1e5384-0933-4bbf-8f04-8160229d0486");

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
