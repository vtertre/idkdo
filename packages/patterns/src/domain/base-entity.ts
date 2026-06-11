import type { Entity } from "./entity.js";

export abstract class BaseEntity<TId> implements Entity<TId> {
  protected constructor(public readonly id: TId) {}

  equals(other: unknown): boolean {
    if (!isObject(other) || !hasOwnId(other)) {
      return false;
    }

    if (Object.getPrototypeOf(other) !== Object.getPrototypeOf(this)) {
      return false;
    }

    return idsEqual(this.id, other.id);
  }
}

type ObjectWithId = {
  readonly id: unknown;
};

type Equatable = {
  equals(other: unknown): boolean;
};

function hasOwnId(value: object): value is ObjectWithId {
  return Object.hasOwn(value, "id");
}

function idsEqual(left: unknown, right: unknown): boolean {
  if (isEquatable(left)) {
    return left.equals(right);
  }

  return Object.is(left, right);
}

function isEquatable(value: unknown): value is Equatable {
  return isObject(value) && "equals" in value && typeof value.equals === "function";
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}
