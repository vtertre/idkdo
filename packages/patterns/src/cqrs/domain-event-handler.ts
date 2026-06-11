import type { DomainEvent } from "../domain/domain-event.js";

export interface DomainEventHandler<TEvent extends DomainEvent> {
  handle(event: TEvent): Promise<void>;
}
