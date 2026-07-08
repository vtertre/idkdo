import { AppError } from "./app-error.js";

export class NotFoundError extends AppError {
  constructor(
    message = "Resource not found.",
    code = "RESOURCE_NOT_FOUND",
    options?: { cause?: unknown },
  ) {
    super(message, code, options);
  }
}
