import type { Query } from "./query.js";

export interface QueryBusMiddleware {
  intercept<TResult>(query: Query<TResult>, next: () => Promise<TResult>): Promise<TResult>;
}
