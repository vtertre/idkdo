import type { Query } from "./query.js";
import type { QueryHandler } from "./query-handler.js";

export interface QueryHandlerRegistry {
  getHandler<TResult, TQuery extends Query<TResult>>(query: TQuery): QueryHandler<TQuery, TResult> | null;
}
