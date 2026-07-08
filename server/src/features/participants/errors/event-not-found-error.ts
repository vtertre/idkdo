import { NotFoundError } from "../../../errors/not-found-error.js";

export class EventNotFoundError extends NotFoundError {
  constructor(eventId: string) {
    super(`Event not found: ${eventId}`);
  }
}
