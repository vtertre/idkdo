import {
  NoHandlerFoundError,
  type Query,
  type QueryHandler,
  type QueryHandlerRegistry,
  type queryResultType,
} from "@idkdo/patterns";
import { describe, expect, it } from "vitest";

import { InvokeQueryHandlerMiddleware } from "./invoke-query-handler-middleware.js";

describe("InvokeQueryHandlerMiddleware", () => {
  it("invokes the registered query handler", async () => {
    const handler = new FakeQueryHandler();
    const middleware = new InvokeQueryHandlerMiddleware(
      new FakeQueryHandlerRegistry(handler),
    );
    const query = new FakeQuery();

    await expect(
      middleware.intercept(query, () => Promise.reject(new Error("unused"))),
    ).resolves.toBe("result");
    expect(handler.handledQuery).toBe(query);
  });

  it("throws when the query has no handler", async () => {
    const middleware = new InvokeQueryHandlerMiddleware(
      new FakeQueryHandlerRegistry(null),
    );

    await expect(
      middleware.intercept(new FakeQuery(), () => Promise.resolve("unused")),
    ).rejects.toThrow(NoHandlerFoundError);
  });
});

class FakeQuery implements Query<string> {
  declare readonly [queryResultType]: string;
}

class FakeQueryHandler implements QueryHandler<FakeQuery, string> {
  handledQuery: FakeQuery | undefined;

  execute(query: FakeQuery): Promise<string> {
    this.handledQuery = query;

    return Promise.resolve("result");
  }
}

class FakeQueryHandlerRegistry implements QueryHandlerRegistry {
  constructor(private readonly handler: FakeQueryHandler | null) {}

  getHandler<TResult, TQuery extends Query<TResult>>(
    _query: TQuery,
  ): QueryHandler<TQuery, TResult> | null {
    return this.handler as QueryHandler<TQuery, TResult> | null;
  }
}
