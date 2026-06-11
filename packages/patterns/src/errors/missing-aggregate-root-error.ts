import { DomainError, type DomainErrorOptions } from "./domain-error.js";

export class MissingAggregateRootError extends DomainError {
  readonly aggregateId: unknown;
  readonly aggregateName: string;

  constructor(aggregateId: unknown, aggregateName = "AggregateRoot", options: DomainErrorOptions = {}) {
    super(`Missing aggregate root ${aggregateName} with id ${String(aggregateId)}`, {
      cause: options.cause,
      code: options.code ?? "MISSING_AGGREGATE_ROOT",
    });

    this.aggregateId = aggregateId;
    this.aggregateName = aggregateName;
  }
}
