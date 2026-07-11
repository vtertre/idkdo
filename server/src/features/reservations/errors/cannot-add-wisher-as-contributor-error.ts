import { BusinessRuleError } from "../../../errors/business-rule-error.js";

export class CannotAddWisherAsContributorError extends BusinessRuleError {
  constructor() {
    super(
      "The wisher cannot contribute to their own wish.",
      "CANNOT_ADD_WISHER_AS_CONTRIBUTOR",
    );
  }
}
