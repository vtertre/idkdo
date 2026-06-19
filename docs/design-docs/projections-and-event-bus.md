# Projections And Event Bus

Status: Accepted initial guidance
Applies To: `server/src/domain/events`, `server/src/projections`, `server/src/infrastructure/event-bus`, projection tables in `packages/db`
Verification: Projection handler tests should verify persisted read models and visibility-sensitive data. Eventual consistency tests may use bounded waiting, but should not assert exact timing.

## Decision

idkdo uses domain events and persisted projections for read models. Query handlers read projection tables instead of rebuilding domain aggregates.

Visibility-sensitive read surfaces must be safe before they leave the server. Projection tables should separate public Wish data from Purchase Coordination data so query handlers can construct viewer-safe API DTOs with deterministic server-side predicates.

Query-time filtering over projection tables is allowed and expected when visibility depends on the selected Participant. Query handlers must not return raw projection rows that include Purchase Coordination to the Wisher, and the frontend must not be responsible for hiding Purchase Coordination.

## Details

## Domain Events

Domain events represent business facts that already happened. Domain events are concrete classes implementing the patterns `DomainEvent` interface.

Naming:

- event names use business past tense;
- examples: `EventCreated`, `ParticipantCreated`, `WishCreated`, `WishUpdated`, `ReservationCreated`, `ReservationContributorAdded`.

Domain event files use kebab-case names matching the event name, for example `wish-created.ts` or `reservation-contributor-added.ts`.

Event metadata:

```ts
interface DomainEvent {
  readonly domainEventId: Uuid;
  readonly occurredAt: Temporal.Instant;
  readonly aggregateType: string;
  readonly aggregateId: Uuid;
}
```

`domainEventId` is the technical event identifier. `eventId` remains reserved for the product Event id.

Domain events carry enough immutable facts for projections to update read models without consulting write-side repositories. They do not carry complete aggregate snapshots by default.

The domain event handler registry is part of the CQRS abstraction. Its interface belongs in `packages/patterns`; concrete registry implementation and event-to-handler mappings belong in server configuration.

## Projections

Projections are persisted from the start.

Projection handlers consume domain events and update dedicated projection tables. Query handlers read from those projection tables.

Persisted projections are designed by read surface rather than as a normalized mirror of the write model. Concrete projection schemas are introduced with the read surface they support.

Projection tables are named after the read surface and use snake_case with the `_projection` suffix, for example `event_wishes_projection` or `participant_wishlist_projection`.

Domain event handler classes are named as reactions with the `<DoSomething>On<EventName>` shape, for example `UpdateEventWishesOnWishCreated` or `UpdateParticipantWishlistOnWishDeleted`.

Domain event handler files use kebab-case names matching the reaction name, for example `update-event-wishes-on-wish-created.ts`.

Rules:

- Projection handlers must not use write-side repositories.
- Projection handlers may use their own projection tables or read-side database access.
- Projection tables are part of the database schema managed by `packages/db`.
- Projection lag is accepted as part of the architecture.
- Tests should verify eventual consistency with bounded waiting, not exact timing.

## Event Bus

The `EventBus` is a port.

Event bus shape:

```ts
interface EventBus {
  publish(events: DomainEvent[]): Promise<void>;
}
```

The current implementation is an `AsyncEventBus`. It accepts a batch of domain events for asynchronous in-process dispatch and does not wait for projection handlers to complete.

`EventBus.publish(...)` resolves according to the implementation's delivery guarantee. For `AsyncEventBus`, it resolves after the batch is accepted for asynchronous dispatch, not after projections are up to date.

The `AsyncEventBus` schedules each event independently through event-specific middleware. Its terminal chain link invokes every projection handler registered for the event's concrete class. The bus does not add dispatch-failure reporting or recovery behavior.

Projection handlers are resolved through explicit configuration mappings from domain event class to projection handler class.

The current event publication mechanism is in-process and non-durable.

Known tradeoff:

```txt
If a command succeeds and the process crashes before event publication or projection handling completes,
projection tables may become stale.
```

That tradeoff is accepted for the current architecture and should be revisited when reliability needs exceed it.

## Eventual Consistency

Command endpoints return command-side results only.

After a successful command, clients must account for projection lag before assuming the updated read model is visible. The concrete refresh strategy is selected by the frontend flow.
