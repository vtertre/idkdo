export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code: string, options?: { cause?: unknown }) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.code = code;
  }
}
