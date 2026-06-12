export class RequestValidationError extends Error {
  constructor() {
    super("Invalid request body.");
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = new.target.name;
  }
}
