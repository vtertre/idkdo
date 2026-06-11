import { describe, expect, it } from "vitest";

import { BaseAggregateRoot } from "./base-aggregate-root.js";
import { Uuid } from "./uuid.js";

class ExampleAggregateRoot extends BaseAggregateRoot<Uuid> {
  constructor(id: Uuid) {
    super(id);
  }
}

describe("BaseAggregateRoot", () => {
  it("inherits entity identity behavior", () => {
    const id = Uuid.random();

    expect(new ExampleAggregateRoot(id).equals(new ExampleAggregateRoot(id))).toBe(true);
  });
});
