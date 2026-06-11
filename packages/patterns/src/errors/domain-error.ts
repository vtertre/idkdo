export type DomainErrorOptions = {
  readonly code?: string;
  readonly cause?: unknown;
};

export class DomainError extends Error {
  readonly code: string;

  constructor(message: string, options: DomainErrorOptions = {}) {
    super(message, errorOptions(options));
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = new.target.name;
    this.code = options.code ?? new.target.name;
  }
}

function errorOptions(options: DomainErrorOptions): ErrorOptions | undefined {
  if (!Object.hasOwn(options, "cause")) {
    return undefined;
  }

  return { cause: options.cause };
}
