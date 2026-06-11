# Workspace Packages

Status: Accepted initial guidance
Applies To: `packages/patterns`, `packages/shared`, `packages/db`
Verification: Future dependency-boundary checks should enforce package responsibilities and forbidden dependencies.

## Decision

idkdo uses a pnpm workspace with small packages that have clear ownership:

- `packages/patterns/` for framework-independent DDD and CQRS abstractions.
- `packages/shared/` for API-facing contracts, validators, types, constants, and path helpers shared between server and web.
- `packages/db/` for Drizzle schema, migrations, projection tables, and database client helpers.

Packages should be introduced with the workspace foundation, but their public surface should grow only when implementation code uses it.

## Details

`packages/patterns` contains reusable architectural building blocks for the workspace. It must not contain idkdo product/domain concepts.

It owns base abstractions as they become necessary:

- command, query, event bus, handler, and handler registry interfaces;
- entity, aggregate root, UUID, domain event, domain error, and repository abstractions.

`packages/patterns` does not currently define a shared value-object base class or interface. Domain value objects should remain plain domain classes until repetition proves a shared abstraction useful.

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

`packages/db` owns persistence schema, migrations, projection tables, and database helpers. It may depend on `packages/shared` for stable shared constants or primitive shared types.

`packages/db` does not contain domain entities, command/query handlers, business policies, or API DTOs. Projection tables are persistence artifacts managed by `packages/db`, even when their API read model DTOs live in `packages/shared`.
