import type { AggregateRoot, Repository } from "@idkdo/patterns";

export abstract class MemoryRepository<TId, TAggregateRoot extends AggregateRoot<TId>>
  implements Repository<TId, TAggregateRoot>
{
  private readonly entities = new Map<TId, TAggregateRoot>();

  add(aggregateRoot: TAggregateRoot): Promise<void> {
    this.entities.set(aggregateRoot.id, aggregateRoot);

    return Promise.resolve();
  }

  get(id: TId): Promise<TAggregateRoot | null> {
    return Promise.resolve(this.entities.get(id) ?? null);
  }

  update(aggregateRoot: TAggregateRoot): Promise<void> {
    this.entities.set(aggregateRoot.id, aggregateRoot);

    return Promise.resolve();
  }

  exists(id: TId): Promise<boolean> {
    return Promise.resolve(this.entities.has(id));
  }
}
