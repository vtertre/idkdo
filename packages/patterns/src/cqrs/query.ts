import type { queryResultType } from "./query-result-type.js";

export interface Query<TResult> {
  readonly [queryResultType]: TResult;
}
