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
- `packages/db/` - Drizzle schema, migrations, and database client helpers.
- `packages/shared/` - internal shared library for API contracts, types, validators, constants, and path helpers when useful.

The Web UI communicates with the server through the REST API under `/api`.
The server owns persistence, domain behavior, visibility rules, permission enforcement, and projection updates.

## 3. Shared Package

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
    cqrs/
    event-bus/
    projections/
    repositories/

  presentation/
    http/
      routes/
```

## 5. Dependency Rules

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

## 6. Commands

Commands represent state-changing use cases.

Command handlers:

- execute through the `CommandBus`;
- orchestrate domain entities, policies, and write-side repositories;
- return command-side results only;
- return the domain events caused by the command;
- do not return projection-backed read models;
- do not import Fastify, HTTP request objects, Zod schemas, or Drizzle directly.

The `CommandBus` is an in-process bus with a minimal implementation. It executes the command handler, then publishes returned domain events through command-bus middleware.

Command result shape:

```ts
type CommandHandlerResult<TResult> = {
  result: TResult;
  events: DomainEvent[];
};
```

## 7. Queries

Queries represent read use cases.

Query handlers:

- execute through the `QueryBus`;
- return API-shaped read models;
- read from dedicated persisted projection tables;
- do not use write-side repositories;
- do not rebuild domain aggregates;
- do not import Fastify or HTTP request objects.

The query side should stay close to SQL. Query handlers should depend on a read-side database port rather than on write-side repository interfaces.

## 8. Domain Model

Domain entities are immutable TypeScript classes.

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

## 9. Domain Events

Domain events represent business facts that already happened.

Naming:

- event names use business past tense;
- examples: `EventCreated`, `ParticipantCreated`, `WishCreated`, `WishUpdated`, `ReservationCreated`, `ReservationContributorAdded`.

Event metadata:

```ts
type DomainEvent<TName extends string, TPayload> = {
  domainEventId: string;
  name: TName;
  occurredAt: Date;
  aggregateType: string;
  aggregateId: string;
  payload: TPayload;
};
```

`domainEventId` is the technical event identifier. `eventId` remains reserved for the product Event id.

Domain events carry enough immutable facts for projections to update read models without consulting write-side repositories. They do not carry complete aggregate snapshots by default.

## 10. Projections

Projections are asynchronous and persisted from the start.

Projection handlers consume domain events and update dedicated projection tables. Query handlers read from those projection tables.

Rules:

- Projection handlers must not use write-side repositories.
- Projection handlers may use their own projection tables or read-side database access.
- Projection tables are part of the database schema managed by `packages/db`.
- Projection lag is accepted as part of the architecture.
- Tests should verify eventual consistency with bounded waiting, not exact timing.

The current event publication mechanism is in-process and asynchronous. Domain events are not durable until an outbox or equivalent durable publication mechanism is introduced.

Known tradeoff:

```txt
If a command succeeds and the process crashes before event publication or projection handling completes,
projection tables may become stale.
```

That tradeoff is accepted for the current architecture and should be revisited when reliability needs exceed it.

## 11. Eventual Consistency

Command endpoints return command-side results only.

After a successful command, clients must re-query the relevant read model if they need the updated view. Because projections are asynchronous, the updated read model may appear after a short delay.

Frontend flows should account for this with pending state, revalidation, or bounded polling where needed.

## 12. Repositories

Write-side repository interfaces live in `server/src/domain/repositories`.

Repository implementations live in `server/src/infrastructure/repositories` and use `packages/db`.

Repositories reconstruct domain entities with `Entity.rehydrate(...)`.
Repositories return `null` when data is missing. Command handlers translate missing data into typed domain `NotFound` errors.

Read-side query handlers do not use repositories.

## 13. Errors

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

## 14. Presentation

The presentation layer is HTTP-only.

Fastify routes:

- parse and validate route params, query params, headers, and bodies;
- construct commands or queries;
- execute them through the relevant bus;
- map successful results to HTTP responses;
- map typed errors to consistent HTTP errors.

Routes must not access Drizzle directly and must not contain domain rules.

