# idkdo Architecture

## Role

This document is the top-level technical map for idkdo.

Product intent belongs in `docs/GOAL.md` and `docs/PRODUCT.md`.
Functional behavior and acceptance criteria belong in `docs/SPEC-implementation.md`.
Detailed technical decisions belong in indexed design docs under `docs/design-docs/`.

Update this file when domains, runtime components, package layering, or architectural invariants change. Do not use it as a full implementation manual.

## Runtime Components

idkdo is a pnpm workspace with these runtime components:

- `web/` - Angular Progressive Web App.
- `server/` - Fastify REST API and backend application.
- `packages/patterns/` - framework-independent DDD and CQRS base interfaces/classes.
- `packages/db/` - Drizzle schema, migrations, projection tables, and database helpers.
- `packages/shared/` - shared API contracts, schemas, types, constants, and path helpers when useful.

The Web UI communicates with the server through the REST API under `/api`.

The server owns persistence, domain behavior, permission enforcement, visibility enforcement, and projection updates. The frontend renders server-provided read models and must not implement hidden Purchase Coordination rules.

## Package Layering

Stable package responsibilities:

- `packages/patterns/` contains reusable architectural abstractions only. It must not contain idkdo product/domain concepts and must not depend on Fastify, Angular, Awilix, Drizzle, PostgreSQL, or Zod.
- `packages/shared/` contains API-facing contracts and validators shared between server and web. It must not contain projection table shapes or server-only infrastructure details.
- `packages/db/` owns the canonical database schema, migrations, projection tables, and database client helpers. It must not contain domain entities, command/query handlers, business policies, or API DTOs.
- `server/` owns backend application behavior, HTTP presentation, command/query handling, domain model, projections, infrastructure wiring, and error mapping.
- `web/` owns browser UI, routing, client-side state, and PWA behavior.

Implementation should introduce abstractions just in time. Keep names and dependency direction compatible with this map, but do not build unused framework surface.

## Server Layering

The server uses a DDD/CQRS shape with one bounded context for gift coordination.

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

## Frontend Layering

The Web UI is an Angular PWA organized feature-first.

Frontend components should use frontend repositories or feature services for API access. Components should not call `HttpClient` directly and should not enforce domain invariants. Visibility-sensitive behavior must come from server-filtered read models.

The service worker caches static application assets only. It must not cache REST API responses containing Event, Participant, Wish, Reservation, Contributor, or Purchase Coordination data.

## Cross-Cutting Invariants

- `X-Participant-Id` is lightweight selected Participant identity, not authentication.
- Server handlers treat selected Participant identity as untrusted input and verify Event membership before applying visibility or mutation rules.
- Zod validation belongs at external boundaries. Domain invariants belong in domain code.
- HTTP errors use the API contract in `docs/SPEC-implementation.md`.
- PostgreSQL is the persistence target; Drizzle owns schema and migrations.
- Tests and future structural checks should enforce dependency direction and anti-spoil behavior.

## Design Docs

Detailed architectural decisions are catalogued in `docs/design-docs/index.md`.

Read design docs only when a task touches that area:

- Backend DDD/CQRS boundaries: `docs/design-docs/backend-ddd-cqrs.md`
- Design doc principles: `docs/design-docs/core-beliefs.md`
- Projections and event bus: `docs/design-docs/projections-and-event-bus.md`
- Workspace packages: `docs/design-docs/workspace-packages.md`
- Frontend architecture: `docs/design-docs/frontend-architecture.md`
