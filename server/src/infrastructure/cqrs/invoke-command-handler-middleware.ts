import {
  NoHandlerFoundError,
  type Command,
  type CommandBusMiddleware,
  type CommandHandlerRegistry,
  type DomainEvent,
} from "@idkdo/patterns";

export class InvokeCommandHandlerMiddleware implements CommandBusMiddleware {
  constructor(private readonly commandHandlerRegistry: CommandHandlerRegistry) {}

  async intercept<TResult>(
    command: Command<TResult>,
    _next: () => Promise<[TResult, DomainEvent[]]>,
  ): Promise<[TResult, DomainEvent[]]> {
    const handler = this.commandHandlerRegistry.getHandler<
      TResult,
      Command<TResult>
    >(command);

    if (!handler) {
      throw new NoHandlerFoundError(command.constructor);
    }

    return handler.execute(command);
  }
}
