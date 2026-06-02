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
4. `ARCHITECTURE.md` when scaffolding, coding, or changing technical structure

`docs/SPEC.md` is long-horizon product context.

`docs/SPEC-implementation.md` is the concrete V1 build contract.

## 3. Repo Map

- `docs/`: product, implementation, and design docs
- `ARCHITECTURE.md`: top-level technical map and entry point to detailed design docs
- `packages/shared/`: shared package placeholder for future API contracts, schemas, and types

## 4. Dev Setup

The application is not scaffolded yet.

## 5. Core Engineering Rules

1. Do not replace strategic docs wholesale unless asked.
   Prefer targeted updates. Keep `docs/SPEC.md` and `docs/SPEC-implementation.md` aligned.

2. Keep repo plan docs dated and centralized.
   When creating a plan file in the repository, new plan documents belong in `docs/plans/` and should use `YYYY-MM-DD-slug.md` filenames.

## 6. Commit Messages

Use Conventional Commits for commit messages.

## 7. Database Change Workflow

The application is not scaffolded yet.

## 8. Verification Before Hand-off

Run `node scripts/verify-docs.mjs` and `git diff --check` before hand-off.

Until broader application verification exists, this is the cheap default verification command.

When broader verification commands are introduced, run the documented cheap default verification before hand-off, and run broader PR-ready verification before creating a PR.

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

The application is not scaffolded yet, so this section is intentionally minimal.

A change is done when:

1. it matches `docs/SPEC-implementation.md` when applicable;
2. existing docs remain coherent;
3. `node scripts/verify-docs.mjs` passes;
4. `git diff --check` passes;
5. PR description follows `.github/PULL_REQUEST_TEMPLATE.md` when a PR is created.
