import { describe, expect, it } from "vitest";

import { Uuid } from "../domain/uuid.js";
import { DomainError } from "./domain-error.js";
import { MissingAggregateRootError } from "./missing-aggregate-root-error.js";

describe("MissingAggregateRootError", () => {
  it("captures the aggregate name and id", () => {
    const aggregateId = Uuid.random();
    const error = new MissingAggregateRootError(aggregateId, "Wish");

    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe("MissingAggregateRootError");
    expect(error.aggregateName).toBe("Wish");
    expect(error.aggregateId).toBe(aggregateId);
    expect(error.message).toBe(`Missing aggregate root Wish with id ${aggregateId.toString()}`);
  });
});
