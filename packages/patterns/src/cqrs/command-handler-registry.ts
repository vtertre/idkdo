import type { Command } from "./command.js";
import type { CommandHandler } from "./command-handler.js";

export interface CommandHandlerRegistry {
  getHandler<TResult, TCommand extends Command<TResult>>(command: TCommand): CommandHandler<TCommand, TResult> | null;
}
