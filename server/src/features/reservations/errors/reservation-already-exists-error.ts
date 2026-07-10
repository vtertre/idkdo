import { StateConflictError } from "../../../errors/state-conflict-error.js";

export class ReservationAlreadyExistsError extends StateConflictError {
  constructor() {
    super("This wish is already reserved.", "RESERVATION_ALREADY_EXISTS");
  }
}
