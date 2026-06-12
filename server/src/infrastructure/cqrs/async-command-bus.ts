import type {
  Command,
  CommandBus,
  CommandBusMiddleware,
  CommandHandlerRegistry,
  DomainEvent,
} from "@idkdo/patterns";

import { InvokeCommandHandlerMiddleware } from "./invoke-command-handler-middleware.js";

export type AsyncCommandBusOptions = {
  readonly commandHandlerRegistry: CommandHandlerRegistry;
  readonly middlewares?: readonly CommandBusMiddleware[];
};

export class AsyncCommandBus implements CommandBus {
  private readonly middlewareChain: MiddlewareChainLink;

  constructor(options: AsyncCommandBusOptions) {
    const finalChain = new MiddlewareChainLink(
      new InvokeCommandHandlerMiddleware(options.commandHandlerRegistry),
      null,
    );

    this.middlewareChain = (options.middlewares ?? []).reduceRight(
      (next, middleware) => new MiddlewareChainLink(middleware, next),
      finalChain,
    );
  }

  async execute<TResult>(command: Command<TResult>): Promise<TResult> {
    const [result] = await this.middlewareChain.apply(command);

    return result;
  }
}

class MiddlewareChainLink {
  constructor(
    private readonly current: CommandBusMiddleware,
    private readonly next: MiddlewareChainLink | null,
  ) {}

  apply<TResult>(command: Command<TResult>): Promise<[TResult, DomainEvent[]]> {
    return this.current.intercept(
      command,
      () =>
        this.next?.apply(command) ??
        Promise.reject(new Error("Command middleware chain has no next link.")),
    );
  }
}
