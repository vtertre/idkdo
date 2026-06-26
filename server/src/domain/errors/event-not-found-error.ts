export class EventNotFoundError extends Error {
  code = "EVENT_NOT_FOUND";

  constructor() {
    super("Event not found.");
  }
}
