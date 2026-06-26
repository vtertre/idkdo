import { BlankParticipantNameError } from "../errors/blank-participant-name-error.js";

export class ParticipantName {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(value: string): ParticipantName {
    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      throw new BlankParticipantNameError();
    }

    return new ParticipantName(trimmedValue);
  }
}
