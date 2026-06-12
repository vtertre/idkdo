import type { DomainEvent, EventBus } from "@idkdo/patterns";

export class NoopEventBus implements EventBus {
  publish(_events: DomainEvent[]): Promise<void> {
    return Promise.resolve();
  }
}
