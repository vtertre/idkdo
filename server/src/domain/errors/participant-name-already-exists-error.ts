import { BusinessRuleViolation } from "@idkdo/patterns";

export class ParticipantNameAlreadyExistsError extends BusinessRuleViolation {
  constructor() {
    super("A participant with that name already exists for this event.", {
      code: "PARTICIPANT_NAME_ALREADY_EXISTS",
    });
  }
}
