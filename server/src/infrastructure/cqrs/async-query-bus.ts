import type {
  Query,
  QueryBus,
  QueryBusMiddleware,
  QueryHandlerRegistry,
} from "@idkdo/patterns";

import { InvokeQueryHandlerMiddleware } from "./invoke-query-handler-middleware.js";

export type AsyncQueryBusOptions = {
  readonly middlewares?: readonly QueryBusMiddleware[];
  readonly queryHandlerRegistry: QueryHandlerRegistry;
};

export class AsyncQueryBus implements QueryBus {
  private readonly middlewareChain: MiddlewareChainLink;

  constructor(options: AsyncQueryBusOptions) {
    const finalChain = new MiddlewareChainLink(
      new InvokeQueryHandlerMiddleware(options.queryHandlerRegistry),
      null,
    );

    this.middlewareChain = (options.middlewares ?? []).reduceRight(
      (next, middleware) => new MiddlewareChainLink(middleware, next),
      finalChain,
    );
  }

  execute<TResult>(query: Query<TResult>): Promise<TResult> {
    return this.middlewareChain.apply(query);
  }
}

class MiddlewareChainLink {
  constructor(
    private readonly current: QueryBusMiddleware,
    private readonly next: MiddlewareChainLink | null,
  ) {}

  apply<TResult>(query: Query<TResult>): Promise<TResult> {
    return this.current.intercept(
      query,
      () =>
        this.next?.apply(query) ??
        Promise.reject(new Error("Query middleware chain has no next link.")),
    );
  }
}
