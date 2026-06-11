import { v4 as randomUuid, validate as isUuid, version as uuidVersion } from "uuid";

export class Uuid {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }

  static random(): Uuid {
    return new Uuid(randomUuid());
  }

  static parse(value: string): Uuid {
    if (!isUuid(value) || uuidVersion(value) === 0) {
      throw new TypeError(`Invalid UUID: ${value}`);
    }

    return new Uuid(value.toLowerCase());
  }

  static from(value: string | Uuid): Uuid {
    if (value instanceof Uuid) {
      return value;
    }

    return Uuid.parse(value);
  }

  equals(other: unknown): boolean {
    return other instanceof Uuid && other.value === this.value;
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
