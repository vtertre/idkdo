import { describe, expect, it } from "vitest";

import { BaseEntity } from "./base-entity.js";
import { Uuid } from "./uuid.js";

class ExampleEntity extends BaseEntity<Uuid> {
  constructor(id: Uuid) {
    super(id);
  }
}

class OtherEntity extends BaseEntity<Uuid> {
  constructor(id: Uuid) {
    super(id);
  }
}

class NumberEntity extends BaseEntity<number> {
  constructor(id: number) {
    super(id);
  }
}

class ObjectIdEntity extends BaseEntity<object> {
  constructor(id: object) {
    super(id);
  }
}

describe("BaseEntity", () => {
  it("compares entities of the same runtime class by id equality", () => {
    const id = Uuid.random();

    expect(new ExampleEntity(id).equals(new ExampleEntity(Uuid.from(id.toString())))).toBe(true);
  });

  it("does not treat different entity classes with the same id as equal", () => {
    const id = Uuid.random();

    expect(new ExampleEntity(id).equals(new OtherEntity(id))).toBe(false);
  });

  it("falls back to Object.is when ids do not expose equals", () => {
    expect(new NumberEntity(1).equals(new NumberEntity(1))).toBe(true);
    expect(new NumberEntity(1).equals(new NumberEntity(2))).toBe(false);
  });

  it("uses reference equality for object ids without an equals method", () => {
    const id = {};

    expect(new ObjectIdEntity(id).equals(new ObjectIdEntity(id))).toBe(true);
    expect(new ObjectIdEntity({}).equals(new ObjectIdEntity({}))).toBe(false);
  });

  it("returns false for non-entity values", () => {
    expect(new ExampleEntity(Uuid.random()).equals(null)).toBe(false);
    expect(new ExampleEntity(Uuid.random()).equals({ id: Uuid.random() })).toBe(false);
  });
});
