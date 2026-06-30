import { BusinessRuleViolation } from "@idkdo/patterns";

export class BlankParticipantNameError extends BusinessRuleViolation {
  constructor() {
    super("Participant name must not be blank.", {
      code: "BLANK_PARTICIPANT_NAME",
    });
  }
}
