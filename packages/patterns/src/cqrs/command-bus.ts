import type { Command } from "./command.js";

export interface CommandBus {
  execute<TResult>(command: Command<TResult>): Promise<TResult>;
}
