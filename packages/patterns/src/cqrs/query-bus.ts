import type { Query } from "./query.js";

export interface QueryBus {
  execute<TResult>(query: Query<TResult>): Promise<TResult>;
}
