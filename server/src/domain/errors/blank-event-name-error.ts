import { BusinessRuleViolation } from "@idkdo/patterns";

export class BlankEventNameError extends BusinessRuleViolation {
  constructor() {
    super("Event name must not be blank.", { code: "BLANK_EVENT_NAME" });
  }
}
