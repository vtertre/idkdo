# Backend Architecture

Status: Accepted
Applies To: `server/`
Verification: Integration tests pin the API contract. Use-case tests run
against PGlite with real migrations. `pnpm verify` checks doc consistency.

## Decision

The server uses vertical slices with transaction scripts. No buses, no
repositories, no projections, no domain-event machinery.

## Details

Three rules:

1. Routes validate and delegate. A route declares shared Zod schemas from
   `packages/shared`, calls one use-case function, and maps the result to a
   reply. Routes contain no SQL and no business rules.
2. Use cases own behavior. One exported async function per use case under
   `server/src/features/<feature>/`. It receives the Drizzle `Database` plus
   validated input, enforces business rules with typed errors from
   `server/src/errors/`, wraps multi-step writes in `db.transaction()`, and
   returns a plain API-shaped result.
3. Reads query the real tables with the viewer as a parameter. Anti-spoil
   visibility (the Wisher must not see Purchase Coordination on their own
   Wishes) is enforced inside query functions via predicates and field omission,
   never in the frontend.

Error mapping: `NotFoundError` maps to 404, `BusinessRuleError` maps to 422,
Fastify validation maps to 400, and everything else maps to 500. The handler
lives in `server/src/http/api-error-handler.ts`.

Identity: `X-Participant-Id` is untrusted selected-Participant identity. Routes
pass it into use cases explicitly; Event-scoped use cases verify membership
before acting. Uniqueness and referential rules are backed by database
constraints; use cases translate constraint violations into typed errors.

Testing: use-case tests run against PGlite (`server/src/test/database/`), and
integration tests pin the HTTP contract with Testcontainers PostgreSQL.
