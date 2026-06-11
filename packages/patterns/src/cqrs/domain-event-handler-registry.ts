import type { DomainEvent } from "../domain/domain-event.js";
import type { DomainEventHandler } from "./domain-event-handler.js";

export interface DomainEventHandlerRegistry {
  getHandlers<TEvent extends DomainEvent>(event: TEvent): DomainEventHandler<TEvent>[];
}
