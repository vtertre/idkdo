import type { DomainEvent } from "../domain/domain-event.js";
import type { Command } from "./command.js";

export interface CommandHandler<TCommand extends Command<TResult>, TResult> {
  execute(command: TCommand): Promise<[TResult, DomainEvent[]]>;
}
