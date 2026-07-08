import { BusinessRuleError } from "../../../errors/business-rule-error.js";

export class CannotCreateWishForAnotherParticipantError extends BusinessRuleError {
  constructor() {
    super(
      "A participant can only create wishes for themselves.",
      "CANNOT_CREATE_WISH_FOR_ANOTHER_PARTICIPANT",
    );
  }
}
