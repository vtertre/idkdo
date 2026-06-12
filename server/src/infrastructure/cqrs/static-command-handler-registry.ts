import type {
  Command,
  CommandHandler,
  CommandHandlerRegistry,
} from "@idkdo/patterns";

export type CommandClass = {
  readonly name: string;
};

export type CommandHandlerRegistration = {
  readonly commandClass: CommandClass;
  readonly handler: CommandHandler<Command<unknown>, unknown>;
};

export class StaticCommandHandlerRegistry implements CommandHandlerRegistry {
  private readonly handlers: ReadonlyMap<CommandClass, CommandHandler<Command<unknown>, unknown>>;

  constructor(registrations: readonly CommandHandlerRegistration[]) {
    this.handlers = new Map(
      registrations.map((registration) => [
        registration.commandClass,
        registration.handler,
      ]),
    );
  }

  getHandler<TResult, TCommand extends Command<TResult>>(
    command: TCommand,
  ): CommandHandler<TCommand, TResult> | null {
    const handler = this.handlers.get(command.constructor);

    if (!handler) {
      return null;
    }

    return handler as CommandHandler<TCommand, TResult>;
  }
}
