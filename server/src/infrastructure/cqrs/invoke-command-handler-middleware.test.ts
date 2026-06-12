import {
  NoHandlerFoundError,
  type Command,
  type CommandHandler,
  type DomainEvent,
  Uuid,
  type commandResultType,
} from "@idkdo/patterns";
import { describe, expect, it } from "vitest";

import { InvokeCommandHandlerMiddleware } from "./invoke-command-handler-middleware.js";
import { StaticCommandHandlerRegistry } from "./static-command-handler-registry.js";

describe("InvokeCommandHandlerMiddleware", () => {
  it("invokes the registered command handler", async () => {
    const expectedResult = Uuid.random();
    const handler = new FakeCommandHandler(expectedResult);
    const middleware = new InvokeCommandHandlerMiddleware(
      new StaticCommandHandlerRegistry([
        {
          commandClass: FakeCommand,
          handler,
        },
      ]),
    );
    const command = new FakeCommand();

    const [result, domainEvents] = await middleware.intercept(command, () =>
      Promise.reject(new Error("Unexpected next middleware call.")),
    );

    expect(handler.handledCommand).toBe(command);
    expect(result.equals(expectedResult)).toBe(true);
    expect(domainEvents).toEqual([]);
  });

  it("is a terminal middleware and does not call next", async () => {
    const handler = new FakeCommandHandler();
    let nextCalled = false;
    const middleware = new InvokeCommandHandlerMiddleware(
      new StaticCommandHandlerRegistry([
        {
          commandClass: FakeCommand,
          handler,
        },
      ]),
    );

    await middleware.intercept(new FakeCommand(), () => {
      nextCalled = true;

      return Promise.reject(new Error("Unexpected next middleware call."));
    });

    expect(nextCalled).toBe(false);
  });

  it("throws when no command handler is registered", async () => {
    const middleware = new InvokeCommandHandlerMiddleware(
      new StaticCommandHandlerRegistry([]),
    );

    await expect(
      middleware.intercept(new UnknownCommand(), () =>
        Promise.reject(new Error("Unexpected next middleware call.")),
      ),
    ).rejects.toThrow(NoHandlerFoundError);
  });
});

class FakeCommand implements Command<Uuid> {
  declare readonly [commandResultType]: Uuid;
}

class UnknownCommand implements Command<Uuid> {
  declare readonly [commandResultType]: Uuid;
}

class FakeCommandHandler implements CommandHandler<FakeCommand, Uuid> {
  handledCommand: FakeCommand | undefined;

  constructor(private readonly result: Uuid = Uuid.random()) {}

  execute(command: FakeCommand): Promise<[Uuid, DomainEvent[]]> {
    this.handledCommand = command;

    return Promise.resolve([this.result, []]);
  }
}
