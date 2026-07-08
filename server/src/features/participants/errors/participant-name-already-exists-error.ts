import { BusinessRuleError } from "../../../errors/business-rule-error.js";

export class ParticipantNameAlreadyExistsError extends BusinessRuleError {
  constructor() {
    super(
      "A participant with that name already exists for this event.",
      "PARTICIPANT_NAME_ALREADY_EXISTS",
    );
  }
}
