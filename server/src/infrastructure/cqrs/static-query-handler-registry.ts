import type {
  Query,
  QueryHandler,
  QueryHandlerRegistry,
} from "@idkdo/patterns";

export type QueryClass = {
  readonly name: string;
};

export type QueryHandlerRegistration = {
  readonly handler: QueryHandler<Query<unknown>, unknown>;
  readonly queryClass: QueryClass;
};

export class StaticQueryHandlerRegistry implements QueryHandlerRegistry {
  private readonly handlers: ReadonlyMap<QueryClass, QueryHandler<Query<unknown>, unknown>>;

  constructor(registrations: readonly QueryHandlerRegistration[]) {
    this.handlers = new Map(
      registrations.map((registration) => [
        registration.queryClass,
        registration.handler,
      ]),
    );
  }

  getHandler<TResult, TQuery extends Query<TResult>>(
    query: TQuery,
  ): QueryHandler<TQuery, TResult> | null {
    const handler = this.handlers.get(query.constructor);

    if (!handler) {
      return null;
    }

    return handler as QueryHandler<TQuery, TResult>;
  }
}
