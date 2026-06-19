import {
  NoHandlerFoundError,
  type Query,
  type QueryBusMiddleware,
  type QueryHandlerRegistry,
} from "@idkdo/patterns";

export class InvokeQueryHandlerMiddleware implements QueryBusMiddleware {
  constructor(private readonly queryHandlerRegistry: QueryHandlerRegistry) {}

  async intercept<TResult>(
    query: Query<TResult>,
    _next: () => Promise<TResult>,
  ): Promise<TResult> {
    const handler = this.queryHandlerRegistry.getHandler<TResult, Query<TResult>>(
      query,
    );

    if (!handler) {
      throw new NoHandlerFoundError(query.constructor);
    }

    return handler.execute(query);
  }
}
