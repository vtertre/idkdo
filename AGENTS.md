# AGENTS.md

Guidance for AI agents working in this repository.

## 1. Purpose

idkdo is a gift coordination app for families and close groups.

The current implementation target is V1 and is defined in `docs/SPEC-implementation.md`.

## 2. Read This First

Before making changes, read in this order:

1. `docs/GOAL.md`
2. `docs/PRODUCT.md`
3. `docs/SPEC-implementation.md`
4. `docs/DEVELOPING.md`
5. `docs/DATABASE.md` when working with local PostgreSQL, Drizzle, or database commands
6. `ARCHITECTURE.md` when scaffolding, coding, or changing technical structure

`docs/SPEC.md` is long-horizon product context.

`docs/SPEC-implementation.md` is the concrete V1 build contract.

## 3. Repo Map

- `docs/`: product, implementation, and design docs
- `ARCHITECTURE.md`: top-level technical map and entry point to detailed design docs
- `server/`: Fastify REST API and backend application
- `web/`: Angular Progressive Web App
- `packages/db/`: Drizzle schema, migrations, and database helpers
- `packages/shared/`: shared package placeholder for future API contracts, schemas, and types

## 4. Dev Setup

```sh
pnpm install
pnpm db:up
pnpm dev
```

The API starts on `http://localhost:3000`.

Keep detailed local development commands in `docs/DEVELOPING.md`.

## 5. Core Engineering Rules

1. Do not replace strategic docs wholesale unless asked.
   Prefer targeted updates. Keep `docs/SPEC.md` and `docs/SPEC-implementation.md` aligned.

2. Keep repo plan docs dated and centralized.
   When creating a plan file in the repository, new plan documents belong in `docs/plans/` and should use `YYYY-MM-DD-slug.md` filenames.

3. Server changes follow the vertical-slice shape in `ARCHITECTURE.md`: route validates and delegates; use-case function owns behavior; queries read the real tables with the viewer as a parameter.

## 6. Commit Messages

Use Conventional Commits for commit messages.

## 7. Database Change Workflow

Database guidance lives in `docs/DATABASE.md`. After Drizzle schema changes,
run `pnpm db:generate` and commit the generated migration files.

## 8. Verification Before Hand-off

Default local/agent verification path:

```sh
pnpm typecheck
pnpm lint
pnpm test
```

This is the cheap default for normal issue work and runs the available workspace lint and test scripts. Do not default to repo-wide build or docs verification when a narrower check is enough to prove the change.

Docs/diff verification is a CI job. Run it locally when your change touches documentation or the harness:

```sh
pnpm verify
```

Run this full check before claiming repo work done in a PR-ready hand-off, or when the change scope is broad enough that targeted checks are not sufficient:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

If anything cannot be run, explicitly report what was not run and why.

## 9. API Expectations

- Base path: `/api`
- Selected Participant identity: `X-Participant-Id`
- Validation: Zod at API boundaries

When adding endpoints:

- enforce Event membership and selected Participant permissions;
- apply Purchase Coordination visibility filtering on the server;
- return consistent HTTP errors (`400/404/409/422/500`).

## 10. UI Expectations

- Keep routes and nav aligned with available API surface.
- Treat mobile-first behavior as part of feature work.
- Do not cache visibility-sensitive REST API responses in the service worker.
- Surface failures clearly; do not silently ignore API errors.

## 11. Harness Improvement

Treat repository files as the durable source of truth.

If repeated failure reveals missing guidance, improve the harness: docs, tests, scripts, checks, examples, or review guidance.

Keep `AGENTS.md` short; put durable detail in the appropriate source document.

Stop and report a blocker when:

- product rules conflict and `docs/SPEC-implementation.md` does not resolve the conflict;
- required verification is missing or failing for reasons unrelated to the current change;
- the requested change would require inventing architecture outside `ARCHITECTURE.md` or the V1 spec.

## 12. Pull Request Requirements

When creating a pull request, read and fill in every section of `.github/PULL_REQUEST_TEMPLATE.md`.

Do not craft ad-hoc PR bodies.

## 13. Definition Of Done

A change is done when all are true:

1. Behavior matches `docs/SPEC-implementation.md` when applicable.
2. Lint, tests, and build pass, or any skipped check is documented with the reason.
3. Contracts stay synced across `packages/db`, `packages/shared`, `server`, and `web` when touched.
4. Docs are updated when behavior, commands, architecture, or expectations change.
5. PR description follows `.github/PULL_REQUEST_TEMPLATE.md` with all sections filled when a PR is created.
