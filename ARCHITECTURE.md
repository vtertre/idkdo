# idkdo Architecture

## Role

This document is the top-level technical map for idkdo.

Product intent belongs in `docs/GOAL.md` and `docs/PRODUCT.md`.
Functional behavior and acceptance criteria belong in `docs/SPEC-implementation.md`.
Detailed technical decisions belong in indexed design docs under `docs/design-docs/`.

Update this file when domains, runtime components, package layering, or
architectural invariants change. Do not use it as a full implementation manual.

## Runtime Components

idkdo is a pnpm workspace with these runtime components:

- `web/` - Angular Progressive Web App.
- `server/` - Fastify REST API and backend application.
- `e2e/` - Playwright browser regression suite and PWA smoke release gate; not
  a product runtime component.
- `packages/db/` - Drizzle schema, migrations, and database client helpers.
- `packages/shared/` - shared API contracts, schemas, types, constants, and path
  helpers when useful.

The Web UI communicates with the server through the REST API under `/api`.

The server owns persistence, domain rules, permission enforcement, and visibility
filtering in queries. The frontend renders server-provided read models and must
not implement hidden Purchase Coordination rules.

## Package Layering

Stable package responsibilities:

- `packages/shared/` contains API-facing contracts and validators shared between
  server and web. It must not contain server-only infrastructure details.
- `packages/db/` owns the canonical database schema, migrations, and database
  client helpers. It must not contain business policies or API DTOs.
- `server/` owns backend application behavior, HTTP presentation, use-case
  functions, database queries, transaction scripts, and error mapping.
- `web/` owns browser UI, routing, client-side state, and PWA behavior.

Implementation should introduce abstractions just in time. Keep names and
dependency direction compatible with this map, but do not build unused framework
surface.

## Server Architecture

The server uses vertical slices with transaction scripts.

Three rules govern server code:

1. Routes validate and delegate. A route declares shared Zod schemas, calls one
   use-case function, and maps the result to a reply. Routes contain no SQL and
   no business rules.
   Route plugins are typed with `FastifyPluginAsyncZod`, and request/reply types
   are inferred from the Zod schemas in each route `schema` block. Do not write
   manual route generics; register routes inline in reading order.
2. Use cases own behavior. One exported async function per use case lives under
   `server/src/features/<feature>/`. It receives the Drizzle `Database` plus
   validated input, enforces business rules with typed errors, wraps multi-step
   writes in `db.transaction()`, and returns a plain API-shaped result.
3. Reads query the real tables with the viewer as a parameter. Anti-spoil
   visibility is enforced inside query functions through predicates and field
   omission, never in the frontend.

Target server layout:

```txt
server/src/
  app.ts
  main.ts
  configuration/
  errors/
  features/
    events/
    participants/
  http/
  test/
```

## Frontend Layering

The Web UI is an Angular PWA organized feature-first.

Pages consume route-scoped feature state, which owns the resources, mutation
actions, and computed view models for its slice. Feature state uses Angular's
HTTP primitives directly: `httpResource` for GET read models with Zod parsing,
`HttpClient` for mutations. There is no frontend repository layer. Components do
not enforce domain invariants, and visibility-sensitive behavior must come from
server-filtered read models.

Viewer-scoped reads take the selected Participant as an explicit reactive input,
never implicitly through the interceptor.

The service worker caches static application assets only. It must not cache REST
API responses containing Event, Participant, Wish, Reservation, Contributor, or
Purchase Coordination data. It does cache the self-hosted fonts.

Frontend rules are numbered in `docs/design-docs/frontend-architecture.md`.
Visual, interaction, and accessibility doctrine lives in `DESIGN.md`.

## Cross-Cutting Invariants

- `X-Participant-Id` is lightweight selected Participant identity, not
  authentication.
- Server use cases treat selected Participant identity as untrusted input and
  verify Event membership before applying visibility or mutation rules.
- Zod validation belongs at external boundaries. Business invariants belong in
  use-case functions and server domain rules.
- Fastify executes shared Zod wire contracts through the HTTP boundary's
  validator and serializer compilers. Routes should reference shared request and
  response schemas directly rather than defining server-local API wire schemas.
- HTTP errors use the API contract in `docs/SPEC-implementation.md`.
- PostgreSQL is the persistence target; Drizzle owns schema and migrations.
- Tests and structural checks should enforce dependency direction, anti-spoil
  behavior, the reservation lifecycle, core browser workflow, and PWA cache
  policy.

## Design Docs

Detailed architectural decisions are catalogued in `docs/design-docs/index.md`.

Read design docs only when a task touches that area:

- Backend architecture: `docs/design-docs/backend-architecture.md`
- Code organization and file boundaries: `docs/design-docs/code-organization.md`
- Design doc principles: `docs/design-docs/core-beliefs.md`
- Workspace packages: `docs/design-docs/workspace-packages.md`
- Frontend architecture: `docs/design-docs/frontend-architecture.md`
