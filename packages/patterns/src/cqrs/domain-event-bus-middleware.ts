import type { DomainEvent } from "../domain/domain-event.js";

export interface DomainEventBusMiddleware {
  intercept(event: DomainEvent, next: () => Promise<void>): Promise<void>;
}
