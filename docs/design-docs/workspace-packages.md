# Workspace Packages

Status: Accepted
Applies To: `packages/shared`, `packages/db`
Verification: Future dependency-boundary checks should enforce package
responsibilities and forbidden dependencies.

## Decision

idkdo uses a pnpm workspace with small packages that have clear ownership:

- `packages/shared/` for API-facing contracts, validators, types, constants, and
  path helpers shared between server and web.
- `packages/db/` for Drizzle schema, migrations, and database client helpers.

Packages should be introduced with the workspace foundation, but their public
surface should grow only when implementation code uses it.

## Details

`packages/shared` is an internal library consumed by workspace applications
through pnpm workspace dependencies.

It should be structured as a small TypeScript package, not as an unstructured
dump of cross-cutting files:

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
- Zod schemas live at application boundaries, not in backend use-case logic.
- Implemented HTTP endpoints should keep their request bodies, params, query
  strings, headers, success responses, and shared error responses in
  `packages/shared` one contract file at a time.
- API paths and shared constants should be centralized when multiple packages
  need them.

API response DTOs and API-facing read model types live in `packages/shared`.
Server use cases return these shared DTO types, and the Web UI consumes the same
types.

Persistence row types and table shapes are internal database details. They do
not live in `packages/shared`.

`packages/db` owns persistence schema, migrations, and database helpers. It may
depend on `packages/shared` for stable shared constants or primitive shared
types.

`packages/db` does not contain business policies or API DTOs.
