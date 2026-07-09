import { BusinessRuleError } from "../../../errors/business-rule-error.js";

export class CannotModifyAnotherParticipantWishError extends BusinessRuleError {
  constructor() {
    super(
      "A participant can only modify their own wishes.",
      "CANNOT_MODIFY_ANOTHER_PARTICIPANT_WISH",
    );
  }
}
