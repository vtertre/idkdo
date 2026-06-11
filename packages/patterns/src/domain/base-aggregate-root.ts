import { BaseEntity } from "./base-entity.js";
import type { AggregateRoot } from "./aggregate-root.js";

export abstract class BaseAggregateRoot<TId>
  extends BaseEntity<TId>
  implements AggregateRoot<TId> {}
