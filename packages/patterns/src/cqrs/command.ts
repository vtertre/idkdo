import type { commandResultType } from "./command-result-type.js";

export interface Command<TResult> {
  readonly [commandResultType]: TResult;
}
