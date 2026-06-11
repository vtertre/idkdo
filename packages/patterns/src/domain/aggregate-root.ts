import type { Entity } from "./entity.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Intentional DDD marker interface.
export interface AggregateRoot<TId> extends Entity<TId> {}
