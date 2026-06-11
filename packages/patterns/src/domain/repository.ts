import type { AggregateRoot } from "./aggregate-root.js";

export interface Repository<TId, TAggregateRoot extends AggregateRoot<TId>> {
  get(id: TId): Promise<TAggregateRoot | null>;
  add(aggregateRoot: TAggregateRoot): Promise<void>;
  update(aggregateRoot: TAggregateRoot): Promise<void>;
  exists(id: TId): Promise<boolean>;
}
