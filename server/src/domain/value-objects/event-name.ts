import { BlankEventNameError } from "../errors/blank-event-name-error.js";

export class EventName {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(value: string): EventName {
    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      throw new BlankEventNameError();
    }

    return new EventName(trimmedValue);
  }
}
