import type { DomainEvent } from "../domain/domain-event.js";
import type { Command } from "./command.js";

export interface CommandBusMiddleware {
  intercept<TResult>(
    command: Command<TResult>,
    next: () => Promise<[TResult, DomainEvent[]]>,
  ): Promise<[TResult, DomainEvent[]]>;
}
