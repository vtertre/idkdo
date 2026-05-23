# idkdo Architecture

## 1. Role

This document describes the current technical architecture of idkdo.

Product intent belongs in `docs/GOAL.md` and `docs/PRODUCT.md`.
Functional behavior and acceptance criteria belong in `docs/SPEC-implementation.md`.
This document explains how the system is organized to implement that behavior.

When the architecture changes, update this file in the same change.

## 2. System Shape

idkdo is a pnpm workspace with these runtime components:

- `web/` - Angular Progressive Web App.
- `server/` - Fastify REST API and backend application.
- `packages/patterns/` - framework-independent DDD and CQRS base interfaces/classes.
- `packages/db/` - Drizzle schema, migrations, and database client helpers.
- `packages/shared/` - internal shared library for API contracts, types, validators, constants, and path helpers when useful.

The Web UI communicates with the server through the REST API under `/api`.
The server owns persistence, domain behavior, visibility rules, permission enforcement, and projection updates.

## 3. Patterns And Shared Packages

`packages/patterns` contains reusable architectural building blocks for the workspace. It must not contain idkdo product/domain concepts.

It owns base DDD and CQRS abstractions:

- command, query, event bus, handler, and handler registry interfaces;
- entity, aggregate root, value object, UUID, domain event, domain error, and repository abstractions.

`packages/patterns` describes abstractions, not application wiring. It does not define idkdo commands, queries, domain events, entities, repositories, read models, or handlers.

`packages/patterns` must not depend on Fastify, Angular, Awilix, Drizzle, PostgreSQL, or Zod.

`packages/shared` is an internal library consumed by workspace applications through pnpm workspace dependencies.

It should be structured as a small TypeScript package, not as an unstructured dump of cross-cutting files:

```txt
packages/shared/
  package.json
  tsconfig.json
  CHANGELOG.md
  src/
    api.ts
    constants.ts
    index.ts
    types/
    validators/
```

Guidelines:

- `types/` contains TypeScript interfaces and API-facing read model types.
- `validators/` contains Zod schemas and input types inferred from those schemas.
- Zod schemas live at application boundaries, not in the domain model.
- API paths and shared constants should be centralized when multiple packages need them.

API response DTOs and API-facing read model types live in `packages/shared`. Server query handlers return these shared DTO types, and the Web UI consumes the same types.

Projection row types and projection table shapes are internal persistence details. They do not live in `packages/shared`.

`packages/db` owns persistence schema, migrations, and database helpers. It may depend on `packages/shared` for stable shared constants or primitive shared types.

## 4. Backend Architecture

The backend uses Domain-Driven Design and CQRS.

The current domain has one bounded context: gift coordination. The code is organized by architectural layer, not by independent feature modules, because Events, Participants, Wishes, Reservations, Contributors, and Purchase Coordination share one domain language and are tightly related.

Target server layout:

```txt
server/src/
  app.ts

  domain/
    entities/
    errors/
    events/
    policies/
    repositories/

  commands/
    events/
    participants/
    wishes/
    reservations/

  queries/
    events/
    participants/
    wishes/
    reservations/

  projections/

  infrastructure/
    composition/
    cqrs/
    event-bus/
    projections/
    repositories/

  presentation/
    http/
      resources/
      routes/
```

## 5. TypeScript Style

Use classes and interfaces by default.

Default style:

- commands, queries, command handlers, query handlers, projection handlers, resources, and repository implementations use classes;
- domain entities use immutable classes;
- domain events use concrete classes implementing the patterns `DomainEvent` interface;
- domain repository contracts and bus contracts use interfaces;
- small pure domain policies and local helpers may use functions.

Plain object types are acceptable for API DTOs, read models, schema-inferred types, and small local helper shapes. Do not use them for commands, queries, or domain events.

## 6. Dependency Injection

The server uses Awilix as its dependency injection container.

Awilix is an infrastructure concern:

- `domain/` must not import Awilix;
- domain entities, policies, domain events, and domain errors must not know about the container;
- command, query, and projection handlers receive dependencies through constructors;
- handlers and repositories must not call `container.resolve(...)` themselves;
- container configuration lives in infrastructure composition code.

The server uses `@fastify/awilix` to expose DI to the HTTP presentation layer.
Presentation resources may be resolved by Awilix, but request-specific values must stay inside request handlers and be passed into commands or queries explicitly.

`loadModules` is allowed for repetitive convention-based registration, such as handlers and resources. Critical runtime dependencies must be registered explicitly, including database access, logger, buses, transaction manager, and low-level adapters.

Awilix strict mode and explicit lifetimes should be used. The intended lifetimes are:

- resources: singleton stateless classes;
- buses: singleton;
- command handlers: transaction-scoped by default;
- write-side repositories: transaction-scoped;
- query handlers: singleton unless they need scoped dependencies;
- projection handlers: singleton unless they need scoped dependencies.

Command transactions are represented by explicit DI scopes. Avoid AsyncLocalStorage-based transaction context unless this decision is revisited.

Command handlers are logically stateless, but they are transaction-scoped because their dependency graph includes transaction-scoped write repositories.

## 7. Dependency Rules

Allowed dependency direction:

```txt
presentation -> command bus / query bus
command bus  -> command handlers
query bus    -> query handlers
commands     -> domain + domain repository interfaces
queries      -> projected read tables through a read-side database port
projections  -> domain events + projected read tables
infrastructure -> domain + commands + queries + projections
```

Forbidden dependencies:

```txt
domain -> infrastructure
domain -> presentation
domain -> Zod
commands -> presentation
queries -> presentation
routes -> Drizzle directly
routes -> business rules
projection handlers -> write-side repositories
```

`packages/db` owns the Drizzle schema, migrations, and database client helpers.
`server/src/infrastructure` wires runtime implementations for repositories, buses, projection execution, and database access, but does not own the canonical schema.

## 8. Commands

Commands represent state-changing use cases.

Commands are classes implementing the generic patterns `Command<TResult>` interface.

```ts
interface Command<TResult> {}
```

The command handler registry is part of the CQRS abstraction. Its interface belongs in `packages/patterns`; concrete registry implementation and mappings belong in server infrastructure composition.

Command handlers:

- execute through the `CommandBus`;
- orchestrate domain entities, policies, and write-side repositories;
- return a tuple containing the command-side result and the domain events caused by the command;
- do not return projection-backed read models;
- do not import Fastify, HTTP request objects, Zod schemas, or Drizzle directly.

The `CommandBus` is a port. The current implementation is an in-process command bus with command-specific middleware.

The `CommandBus` caller receives only the command-side result. Domain events are internal to command execution and are published by command-bus middleware.

Command handler shape:

```ts
interface CommandHandler<TCommand extends Command<TResult>, TResult> {
  execute(command: TCommand): Promise<[TResult, DomainEvent[]]>;
}
```

Command bus shape:

```ts
interface CommandBus {
  execute<TResult>(command: Command<TResult>): Promise<TResult>;
}
```

Each command execution owns one database transaction. Transaction handling is a command middleware responsibility. Domain events are published only after the command transaction commits successfully.

If event publication fails after the transaction commits, the command is still considered successful. The bus logs the publication failure with domain event metadata and returns the command result.

Command handlers are resolved through an explicit composition mapping from command class to handler class. The mapping lives in `server/src/infrastructure/composition`. Handlers do not need `handles()` metadata.

Registries store handler classes or DI registration tokens, not handler instances. Command handlers are transaction-scoped and must be resolved inside the command execution scope.

Command transaction flow:

```txt
CommandBus receives command instance
  -> registry resolves command class to handler class
  -> transaction middleware opens Drizzle transaction
  -> command-specific Awilix child scope is created
  -> transaction-bound database session is registered in that scope
  -> command handler is resolved from that scope
  -> write repositories are resolved from that same scope
  -> handler executes
  -> transaction commits
  -> domain events are published
  -> command-side result is returned
```

Write repositories must not fall back to the global database client. If a write repository is resolved without a transaction-bound database session, composition must fail.

## 9. Queries

Queries represent read use cases.

Queries are classes implementing the generic patterns `Query<TResult>` interface.

```ts
interface Query<TResult> {}
```

The query handler registry is part of the CQRS abstraction. Its interface belongs in `packages/patterns`; concrete registry implementation and mappings belong in server infrastructure composition.

Query handlers:

- execute through the `QueryBus`;
- return API-shaped read models;
- read from dedicated persisted projection tables;
- do not use write-side repositories;
- do not rebuild domain aggregates;
- do not import Fastify or HTTP request objects.

The query side should stay close to SQL. Query handlers should depend on a read-side database port rather than on write-side repository interfaces.

The `QueryBus` is a port. The current implementation is an in-process query bus with query-specific middleware.

Query bus shape:

```ts
interface QueryBus {
  execute<TResult>(query: Query<TResult>): Promise<TResult>;
}
```

Query handlers are resolved through an explicit composition mapping from query class to handler class.

## 10. Domain Model

Domain entities are immutable TypeScript classes.

Core domain shapes:

```ts
interface Entity<TId = Uuid> {
  readonly id: TId;
}

abstract class BaseEntity<TId = Uuid> implements Entity<TId> {
  protected constructor(public readonly id: TId) {}
}

interface AggregateRoot<TId = Uuid> extends Entity<TId> {}

abstract class BaseAggregateRoot<TId = Uuid>
  extends BaseEntity<TId>
  implements AggregateRoot<TId> {}
```

`AggregateRoot` marks aggregate boundaries. `BaseAggregateRoot` does not store unpublished domain events and does not expose `record()` or `pullDomainEvents()`.

The domain uses one shared `Uuid` value object for entity ids and domain event ids. Do not create one id class per entity by default.

`Uuid.random()` creates UUIDs through the platform crypto implementation. Domain factory methods may create their own ids and timestamps internally.

Technical timestamps in the domain use `Temporal.Instant`. API contracts serialize timestamps as ISO strings, and PostgreSQL stores them as `timestamptz`.

Domain value objects are used for business scalar values with invariants. Initial idkdo value objects include `EventName`, `ParticipantName`, and `WishContent`.

Entities use these value objects instead of raw strings. API DTOs and read models may still expose these values as strings.

Rules:

- Constructors are private.
- `Entity.create(...)` creates new domain state and returns `[entity, domainEvents]`.
- `Entity.rehydrate(...)` rebuilds existing domain state from persistence and returns the entity without events.
- State-changing methods return `[updatedEntity, domainEvents]`.
- Entities do not store unpublished events internally.
- Cross-entity permission and visibility rules live in pure domain policy functions.

Example shape:

```ts
const [wish, events] = Wish.create(input);
const [updatedWish, updateEvents] = wish.updateContent(input);
const existingWish = Wish.rehydrate(row);
```

The domain does not depend on Zod. Domain invariants are enforced with domain code, value objects, policies, and typed domain errors.

## 11. Domain Events

Domain events represent business facts that already happened. Domain events are concrete classes implementing the patterns `DomainEvent` interface.

Naming:

- event names use business past tense;
- examples: `EventCreated`, `ParticipantCreated`, `WishCreated`, `WishUpdated`, `ReservationCreated`, `ReservationContributorAdded`.

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

The domain event handler registry is part of the CQRS abstraction. Its interface belongs in `packages/patterns`; concrete registry implementation and event-to-handler mappings belong in server infrastructure composition.

## 12. Projections

Projections are persisted from the start.

Projection handlers consume domain events and update dedicated projection tables. Query handlers read from those projection tables.

Persisted projections are designed by read surface rather than as a normalized mirror of the write model. Concrete projection schemas are introduced with the read surface they support.

Projection tables are named after the read surface and use snake_case with the `_projection` suffix, for example `event_wishes_projection` or `participant_wishlist_projection`.

Domain event handler classes are named as reactions with the `<DoSomething>On<EventName>` shape, for example `UpdateEventWishesOnWishCreated` or `UpdateParticipantWishlistOnWishDeleted`.

Visibility-sensitive read models encode visibility at projection time. Query handlers read already-safe projection rows and must not rely on last-mile filtering to hide Purchase Coordination.

Rules:

- Projection handlers must not use write-side repositories.
- Projection handlers may use their own projection tables or read-side database access.
- Projection tables are part of the database schema managed by `packages/db`.
- Projection lag is accepted as part of the architecture.
- Tests should verify eventual consistency with bounded waiting, not exact timing.

The `EventBus` is a port.

Event bus shape:

```ts
interface EventBus {
  publish(events: DomainEvent[]): Promise<void>;
}
```

The current implementation is an `AsyncEventBus`. It accepts an ordered batch of domain events for asynchronous in-process dispatch and does not wait for projection handlers to complete.

`EventBus.publish(...)` resolves according to the implementation's delivery guarantee. For `AsyncEventBus`, it resolves after the batch is accepted for asynchronous dispatch, not after projections are up to date.

The `AsyncEventBus` uses event-specific middleware. It dispatches events sequentially in publication order. Projection handler failures are logged with the domain event metadata and handler name. A projection handler failure does not block dispatch of subsequent events.

Projection handlers are resolved through explicit composition mappings from domain event class to projection handler class.

Domain events are not durable until an outbox or equivalent durable publication mechanism is introduced.

Known tradeoff:

```txt
If a command succeeds and the process crashes before event publication or projection handling completes,
projection tables may become stale.
```

That tradeoff is accepted for the current architecture and should be revisited when reliability needs exceed it.

## 13. Eventual Consistency

Command endpoints return command-side results only.

After a successful command, clients must re-query the relevant read model if they need the updated view. Because projections are asynchronous, the updated read model may appear after a short delay.

Frontend flows should account for this with pending state, revalidation, or bounded polling where needed.

## 14. Repositories

Write-side repository interfaces live in `server/src/domain/repositories`.

Repository implementations live in `server/src/infrastructure/repositories` and use `packages/db`.

Repositories reconstruct domain entities with `Entity.rehydrate(...)`.
Repositories return `null` when data is missing. Command handlers translate missing data into typed domain `NotFound` errors.

Read-side query handlers do not use repositories.

## 15. Errors

The domain uses typed error classes.

Examples:

- `EventNotFoundError`
- `ParticipantNotFoundError`
- `WishNotFoundError`
- `ReservationNotFoundError`
- `BlankWishContentError`
- `CannotEditAnotherParticipantWishError`
- `CannotReserveOwnWishError`
- `CannotAddWisherAsContributorError`
- `ReservationAlreadyExistsError`

Domain errors do not know about HTTP and do not carry status codes.
The presentation layer maps domain errors to the REST error contract defined in `docs/SPEC-implementation.md`.

## 16. Presentation

The presentation layer is HTTP-only.

Presentation uses Resource classes as the HTTP boundary. Fastify route files register URLs and delegate to resource methods.

Resources:

- parse and validate route params, query params, headers, and bodies;
- construct commands or queries;
- execute them through the relevant bus;
- map successful results to HTTP responses;
- map typed errors to consistent HTTP errors.

Resources and routes must not access Drizzle directly and must not contain domain rules.
