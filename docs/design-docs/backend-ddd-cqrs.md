# Backend DDD/CQRS Boundaries

Status: Accepted initial guidance
Applies To: `server/`, `packages/patterns`, backend tests
Verification: Future structural tests should enforce dependency direction. Backend tests should cover domain rules, command/query orchestration, API validation, identity headers, error mapping, and permission enforcement.

## Decision

The backend uses Domain-Driven Design and CQRS within one bounded context: gift coordination.

The code is organized by architectural layer, not by independent feature modules, because Events, Participants, Wishes, Reservations, Contributors, and Purchase Coordination share one domain language and are tightly related.

## Details

## Target Server Layout

```txt
server/src/
  app.ts

  configuration/

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
      resources/
      routes/
```

## TypeScript Style

Use classes and interfaces by default.

Default style:

- commands, queries, command handlers, query handlers, projection handlers, resources, and repository implementations use classes;
- domain entities use immutable classes;
- domain events use concrete classes implementing the patterns `DomainEvent` interface;
- domain repository contracts and bus contracts use interfaces;
- small pure domain policies and local helpers may use functions.

Plain object types are acceptable for API DTOs, read models, schema-inferred types, and small local helper shapes. Do not use them for commands, queries, or domain events.

## Dependency Injection

The server uses Awilix as its dependency injection container.

Awilix is an infrastructure concern:

- `domain/` must not import Awilix;
- domain entities, policies, domain events, and domain errors must not know about the container;
- command, query, and projection handlers receive dependencies through constructors;
- handlers and repositories must not call `container.resolve(...)` themselves;
- container configuration lives in `server/src/configuration`.

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

## Configuration

Server application wiring lives under `server/src/configuration`.

Configuration code is responsible for:

- configuring Awilix and `@fastify/awilix`;
- registering runtime dependencies;
- loading handlers and resources when useful;
- declaring command, query, and domain event handler mappings;
- creating buses, registries, and middleware chains;
- defining lifetimes and command transaction scopes.

Command, query, and domain event mappings are explicit configuration because handlers are resolved by class or DI token in the appropriate runtime scope. The mapping must not depend on already-instantiated handler objects.

## Commands

Commands represent state-changing use cases.

Commands are classes implementing the generic patterns `Command<TResult>` interface.

```ts
declare const commandResultType: unique symbol;

interface Command<TResult> {
  readonly [commandResultType]: TResult;
}
```

Command classes declare the phantom result member so TypeScript can infer `CommandBus.execute(...)` result types from concrete command instances. The member is type-only in command classes and does not represent runtime command data.

Command classes use the `*Command` suffix and command handler classes use the `*CommandHandler` suffix. Files use kebab-case names matching the class role, for example `create-wish-command.ts` and `create-wish-command-handler.ts`.

The command handler registry is part of the CQRS abstraction. Its interface belongs in `packages/patterns`; concrete registry implementation and mappings belong in server configuration.

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

Command handlers are resolved through an explicit configuration mapping from command class to handler class. The mapping lives in `server/src/configuration`. Handlers do not need `handles()` metadata.

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

Write repositories must not fall back to the global database client. If a write repository is resolved without a transaction-bound database session, dependency resolution must fail.

## Queries

Queries represent read use cases.

Queries are classes implementing the generic patterns `Query<TResult>` interface.

```ts
declare const queryResultType: unique symbol;

interface Query<TResult> {
  readonly [queryResultType]: TResult;
}
```

Query classes declare the phantom result member so TypeScript can infer `QueryBus.execute(...)` result types from concrete query instances. The member is type-only in query classes and does not represent runtime query data.

Query classes use the `*Query` suffix and query handler classes use the `*QueryHandler` suffix. Files use kebab-case names matching the class role, for example `list-event-wishes-query.ts` and `list-event-wishes-query-handler.ts`.

The query handler registry is part of the CQRS abstraction. Its interface belongs in `packages/patterns`; concrete registry implementation and mappings belong in server configuration.

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

Query handlers are resolved through an explicit configuration mapping from query class to handler class.

## Domain Model

Domain entities are immutable TypeScript classes.

Core domain shapes:

```ts
interface Entity<TId> {
  readonly id: TId;
  equals(other: unknown): boolean;
}

abstract class BaseEntity<TId> implements Entity<TId> {
  protected constructor(public readonly id: TId) {}

  equals(other: unknown): boolean {
    // Exact runtime class and id equality.
  }
}

interface AggregateRoot<TId> extends Entity<TId> {}

abstract class BaseAggregateRoot<TId>
  extends BaseEntity<TId>
  implements AggregateRoot<TId> {}
```

`AggregateRoot` marks aggregate boundaries. `BaseAggregateRoot` does not store unpublished domain events and does not expose `record()` or `pullDomainEvents()`.

The domain uses one shared `Uuid` value object for entity ids and domain event ids. Do not create one id class per entity by default.

`Uuid.random()` creates UUIDs through the platform crypto implementation. Domain factory methods may create their own ids and timestamps internally.

Technical timestamps in the domain use `Temporal.Instant`. API contracts serialize timestamps as ISO strings, and PostgreSQL stores them as `timestamptz`.

Domain value objects are used for business scalar values with invariants. Initial idkdo value objects include `EventName`, `ParticipantName`, and `WishContent`.

Entities use these value objects instead of raw strings. API DTOs and read models may still expose these values as strings.

The patterns package does not provide a shared value-object base class or interface yet. Domain value objects are plain domain classes unless repetition proves a shared abstraction useful.

Rules:

- Constructors are private.
- Domain factory methods create new domain state and return `[entity, domainEvents]`.
- Rehydration methods rebuild persisted domain state and return the entity without events.
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

## Repositories

Write-side repository interfaces live in `server/src/domain/repositories`.

Repository implementations live in `server/src/infrastructure/repositories` and use `packages/db`.

Repositories reconstruct domain entities with rehydration methods.
Repositories return `null` when data is missing. Command handlers translate missing data into typed domain `NotFound` errors.

Read-side query handlers do not use repositories.

## Errors

Business errors are typed classes and are transport-agnostic.

Business error classes use the `*Error` suffix. Files use kebab-case names matching the class role, for example `wish-not-found-error.ts`.

Application and domain code throw typed business errors for expected business-rule, not-found, and conflict cases. Boundary validation errors are handled by presentation validation.

The HTTP presentation layer owns API error mapping. Resources and route-level error handlers map known business errors and validation errors to the API error contract.

API error responses use a consistent JSON shape. The exact list of error codes grows with implementation, but the shape must remain stable once introduced.

Routes must not leak raw infrastructure errors, stack traces, SQL errors, or unvalidated exception messages to clients.

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

## Validation Boundary

Zod validation is used at external boundaries.

HTTP resources validate route params, query params, headers, and request bodies before constructing commands or queries. Environment variables are validated during server startup before the application begins accepting traffic.

Shared API request and response schemas live in `packages/shared` when they are consumed by both server and web. Server-only infrastructure schemas stay in `server`.

Domain entities, value objects, policies, commands, queries, and domain events do not depend on Zod. The domain still enforces its own invariants through value objects, constructors, factories, and business errors.

Validation converts untrusted external input into trusted application input. It does not replace business invariants.

## Presentation

The presentation layer is HTTP-only.

Presentation uses Resource classes as the HTTP boundary. Fastify route files register URLs and delegate to resource methods.

Resource classes use the `*Resource` suffix. Files use kebab-case names matching the class role, for example `wish-resource.ts`.

Resources:

- parse and validate route params, query params, headers, and bodies;
- construct commands or queries;
- execute them through the relevant bus;
- map successful results to HTTP responses;
- map typed errors to consistent HTTP errors.

Resources and routes must not access Drizzle directly and must not contain domain rules.

## Identity And Permissions

idkdo uses lightweight selected Participant identity, not user authentication.

For API requests that need actor or viewer context, the HTTP resource reads `X-Participant-Id` and includes it when constructing the command or query. Command and query handlers do not read HTTP headers directly.

The selected Participant id is treated as untrusted input. Before executing Event-scoped behavior, handlers must verify that the selected Participant belongs to the relevant Event.

Commands receive an actor Participant id when they mutate Event-scoped state. Queries receive a viewer Participant id when their read model depends on the selected Participant perspective. Actor/viewer identity is explicit in commands and queries; do not use implicit request context for authorization.

Permission rules for mutations are enforced in command handlers through domain policies and business errors. Purchase Coordination visibility is enforced through projections and API read models, not by frontend code.

The frontend may persist selected Participant identity for convenience, scoped by Event id, but this state is never trusted as authorization by the server.

## Testing

Tests should follow the architecture boundaries and focus on the risk of the layer under test.

Domain tests are pure and do not use database, HTTP, Fastify, Awilix, or Zod. They cover entities, value objects, policies, domain events, and business errors.

Command handler tests verify application orchestration with repository test doubles by default. Database-backed tests are used when transaction behavior, repository implementations, or integration with Drizzle/PostgreSQL is the subject.

API integration tests verify route wiring, Zod validation, identity headers, error mapping, and permission enforcement.

Configuration tests verify that DI registration, command/query/event handler mappings, and transaction-scoped dependencies resolve correctly.

End-to-end tests cover the core gift coordination flow and anti-spoil behavior.
