import {
  NoHandlerFoundError,
  type Query,
  type QueryBusMiddleware,
  type QueryHandler,
  Uuid,
  type queryResultType,
} from "@idkdo/patterns";
import { describe, expect, it } from "vitest";

import { AsyncQueryBus } from "./async-query-bus.js";
import { StaticQueryHandlerRegistry } from "./static-query-handler-registry.js";

describe("AsyncQueryBus", () => {
  it("executes a query with its handler", async () => {
    const expectedResult = { id: Uuid.random().toString() };
    const handler = new RecordingQueryHandler(expectedResult);
    const queryBus = new AsyncQueryBus({
      queryHandlerRegistry: new StaticQueryHandlerRegistry([
        { handler, queryClass: FakeQuery },
      ]),
    });
    const query = new FakeQuery();

    await expect(queryBus.execute(query)).resolves.toEqual(expectedResult);
    expect(handler.handledQuery).toBe(query);
  });

  it("chains middleware in constructor order", async () => {
    const calls: string[] = [];
    const queryBus = new AsyncQueryBus({
      middlewares: [
        new OrderedQueryMiddleware("first", calls),
        new OrderedQueryMiddleware("second", calls),
      ],
      queryHandlerRegistry: new StaticQueryHandlerRegistry([
        {
          handler: new RecordingQueryHandler({ id: Uuid.random().toString() }),
          queryClass: FakeQuery,
        },
      ]),
    });

    await queryBus.execute(new FakeQuery());

    expect(calls).toEqual([
      "first:before",
      "second:before",
      "second:after",
      "first:after",
    ]);
  });

  it("throws when no handler is registered", async () => {
    const queryBus = new AsyncQueryBus({
      queryHandlerRegistry: new StaticQueryHandlerRegistry([]),
    });

    await expect(queryBus.execute(new FakeQuery())).rejects.toThrow(
      NoHandlerFoundError,
    );
  });
});

type FakeQueryResult = { readonly id: string };

class FakeQuery implements Query<FakeQueryResult> {
  declare readonly [queryResultType]: FakeQueryResult;
}

class RecordingQueryHandler
  implements QueryHandler<FakeQuery, FakeQueryResult>
{
  handledQuery: FakeQuery | undefined;

  constructor(private readonly result: FakeQueryResult) {}

  execute(query: FakeQuery): Promise<FakeQueryResult> {
    this.handledQuery = query;

    return Promise.resolve(this.result);
  }
}

class OrderedQueryMiddleware implements QueryBusMiddleware {
  constructor(
    private readonly name: string,
    private readonly calls: string[],
  ) {}

  async intercept<TResult>(
    _query: Query<TResult>,
    next: () => Promise<TResult>,
  ): Promise<TResult> {
    this.calls.push(`${this.name}:before`);
    const result = await next();
    this.calls.push(`${this.name}:after`);

    return result;
  }
}
