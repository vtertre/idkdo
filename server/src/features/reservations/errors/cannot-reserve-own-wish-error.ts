import { BusinessRuleError } from "../../../errors/business-rule-error.js";

export class CannotReserveOwnWishError extends BusinessRuleError {
  constructor() {
    super(
      "A participant cannot reserve their own wish.",
      "CANNOT_RESERVE_OWN_WISH",
    );
  }
}
