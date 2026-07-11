import { StateConflictError } from "../../../errors/state-conflict-error.js";

export class ContributorAlreadyExistsError extends StateConflictError {
  constructor() {
    super(
      "This participant already contributes to the reservation.",
      "CONTRIBUTOR_ALREADY_EXISTS",
    );
  }
}
