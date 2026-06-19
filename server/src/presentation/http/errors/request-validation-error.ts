export class RequestValidationError extends Error {
  constructor(message = "Invalid request body.") {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = new.target.name;
  }
}
