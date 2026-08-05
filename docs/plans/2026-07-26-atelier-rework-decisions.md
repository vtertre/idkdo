# Atelier Rework — Locked Decisions

Date: 2026-07-26
Applies To: the Atelier Angular rework only
Companion to: [the rework plan](2026-07-24-atelier-angular-rework.html)

## Purpose

This note holds the decisions that are specific to the Atelier rework: scope
calls, migration steps, point-in-time findings, and target state that does not
exist yet.

It is deliberately separate from the durable documents.
[DESIGN.md](../../DESIGN.md) and
[frontend-architecture.md](../design-docs/frontend-architecture.md) state rules
that outlive any single piece of work; a reader who has never heard of this
rework should be able to follow them without confusion. Anything phrased as "we are changing X to Y,"
"this phase must do Z," or "the old class is removed" belongs here instead.

**This note is disposable.** When the rework ships, it is archived with the plan
beside it. Nothing durable should depend on it.

Rules are numbered `RW-n`. Each cites the durable rule it applies, so the
dependency runs one way: this note points at `FE-n` and `DS-n`; those documents
never point back here.

## Scope Decisions

**RW-1 — The entry projection gains `wishCount`; no other contract changes.**
Per-Participant Wish counts are added to the event-entry read model in shared
schemas and the server query, because Atelier shows counts before an identity is
selected and the viewer-scoped Wishes endpoint cannot supply them.

The count is used **only** on the pre-identity entry screen. In-shell counts come
from the board resource per FE-8. That is the sole justification for the contract
change and keeps it smaller than originally scoped.

Requirements: the projection contains no Reservation or Contributor data, proven
by test; the query is free of N+1 access across Participants, asserted in a
server test rather than by inspection;
[SPEC-implementation.md](../SPEC-implementation.md) §7 is updated in the same
pull request as the schema and server change, per AGENTS.md §5 rule 1.

If the count slice is not accepted, drop the labels from the entry screen — the
rework then makes no server or shared-contract change at all.

**RW-2 — `GET /api/participants/:participantId/wishes` becomes unused by the web
app.** `/mine` is computed from the Event Wishes resource, where the viewer's own
Wishes are already present with `kind: "hidden"`. Leave the endpoint in place and
serving; removing server surface is outside this rework. Recorded so a later
cleanup does not have to rediscover why it has no frontend caller.

**RW-3 — No old/new coexistence machinery.** Nothing is released until the whole
rework is complete and approved, so there is no feature flag, no parallel `/v2`
path, and no dual implementation on `/events/:eventId`. Merging is not releasing:
CI runs on pull request and on push to `main`, and no pipeline deploys on merge.

**RW-4 — Target route map.** The rework builds toward these destinations, per
FE-18. [SPEC-implementation.md](../SPEC-implementation.md) is updated to specify
them as they land.

| Route | Surface |
| --- | --- |
| `/` | Create an Event (eager landing route) |
| `/events/:eventId/entry` | Choose or create a Participant |
| `/events/:eventId` | All-lists workbench (default child of the lazy shell) |
| `/events/:eventId/mine` | My list |
| `/events/:eventId/participants/:participantId` | One Participant's list |
| `/events/:eventId/wishes/new` | Add a Wish |
| `/events/:eventId/wishes/:wishId/edit` | Edit or delete own Wish |
| `/events/:eventId/wishes/:wishId/coordination` | Manage or join coordination |
| `/events/:eventId/unavailable` | Event unavailable |
| `**` | Redirect to `/` |

The Event board store is provided on the shell route, not on its children
(FE-7), and the selected-Participant guard is applied once on the shell (FE-5),
moving from `features/events/data-access/` to `core/identity/`. The board slice
stays under one feature owner (FE-3): do not leave `event-board-page` under
`features/events/` while `event-board-store` sits under `features/wishes/`.

## Migration Steps

**RW-5 — Remove the repository layer and its error classes.** Delete
`EventRepositoryError`, `WishRepositoryError`, the repository classes, and every
duplicated `normalizeError`, replacing them with the single decoder and
`ApiFailure` union of FE-14. Each artifact goes in the phase whose replacement
passes its gate, per FE-24 — not in a final cleanup batch.

**RW-6 — Restate the entry projection-lag retry against `ApiFailure`.**
`event-entry-route.ts` currently retries a 404 with 50/100/200/400 ms backoff
before redirecting to `/unavailable`, keyed on `EventRepositoryError.status ===
404`. RW-5 deletes that class. The behavior is required by FE-16 and must be
restated against `ApiFailure { kind: "api", status: 404 }` and covered by a test.
Dropping it silently makes "create an Event, open the share link" intermittently
broken.

**RW-7 — Repair the anti-spoil assertions before renaming anything.** FE-22
requires a positive control on every negative visibility assertion. Four sites
are keyed on `.purchase-coordination`, and this rework renames that class:

- `e2e/tests/anti-spoil.spec.ts:41`
- `e2e/tests/core-workflow.spec.ts:66`
- `web/src/app/features/wishes/components/event-wishes-panel/event-wishes-panel.spec.ts:105`
  *(already paired before Phase 0)*
- the second assertion in the same spec at line 358

All four go vacuously green on the rename. Add the positive control to each in
Phase 0, prove it by trying the rename, and land it before any phase touches the
class.

**RW-8 — Extend service-worker asset coverage to the fonts.** FE-20 requires the
offline shell to render in its real typefaces. The current `ngsw-config.json`
asset groups match only `/favicon.ico`, `/index.html`, `/manifest.webmanifest`,
`/*.css`, `/*.js`, and `/icons/**`. Angular emits CSS-referenced fonts as hashed
files under `/media/`, which none of those patterns match. Do this in Phase 1
alongside the font work, and verify in the generated `ngsw.json` — otherwise the
Phase 1 gate passes while the offline shell silently falls back.

## Point-In-Time Findings

These were true when checked and are expected to age. Re-verify rather than
trusting them.

**RW-9 — Angular primitive stability, verified 2026-07-26.** In the pinned
`@angular/common@22.0.2`, `httpResource` is annotated `@publicApi 22.0`. In
`@angular/forms@22.0.2`, `form()` and `validateStandardSchema()` are likewise
`@publicApi 22.0`. The only `@experimental` symbol in the Signal Forms surface is
`provideExperimentalWebMcpForms`, which this rework does not use. Neither core
primitive is developer preview, satisfying FE-13.

**RW-10 — Contrast audit of the Atelier mockup, measured 2026-07-26.** Three
token roles fail WCAG AA as text on `--surface: #fffdf8`, which is why DS-3
forbids copying mockup values:

| Mockup value | Used as | Ratio | Verdict |
| --- | --- | --- | --- |
| `--muted #8a7867` | secondary text | 4.16:1 | fails AA normal text |
| `--terracotta #c05b3c` | link and action text | 4.30:1 | fails AA normal text |
| `#c78f2d` (avatar) | white initials on fill | 2.84:1 | fails AA large text |

Deeper variants already in the palette pass: `#756453` at 5.59:1 and `#a34a2f` at
5.78:1. Adopt those as the text tokens per DS-3 and re-derive the avatar palette
so every entry clears 4.5:1 under white initials at the rendered size.

**RW-11 — Angular patch baseline.** Update Angular framework, build, and CLI
packages together to the latest compatible 22.0 patch and run Angular
migrations. 22.0.8 was current at time of writing; 22.1.0-rc.0 is on `next` and
is not a target. Capture baseline bundle sizes, unit results, core E2E results,
and mobile/desktop screenshots before feature work begins.

## Delivery

**RW-12 — One phase per pull request, eight total.** Phase boundaries are PR
boundaries. Repository history is one PR per slice (#17–#21) and AGENTS.md §12
requires every section of the PR template filled each time; eight phases in one
pull request is unreviewable. Each PR compiles and passes the full gate
(`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`)
before the next begins.

The release gate runs once more at the end against the complete result — it is
not implicitly satisfied by eight green phase PRs.

**RW-13 — Phase 0 is a gate, not a formality.** It does not open Phase 1 until
all of the following hold:

1. [DESIGN.md](../../DESIGN.md),
   [frontend-architecture.md](../design-docs/frontend-architecture.md), and
   [ARCHITECTURE.md](../../ARCHITECTURE.md) are amended and signed off, and
   `pnpm verify` passes. *(Done 2026-07-26 — the repository-pattern reversal is
   recorded in the frontend architecture doc.)*
2. RW-7 is merged, and the positive control has been proven to fail on a rename
   rather than assumed to. *(Implemented locally 2026-07-28; merge and PR
   evidence remain pending.)*
3. This note states the identity rule, store ownership, count source, and 404
   retry as locked decisions. *(Done — RW-1, RW-4, RW-6, and FE-4.)*
4. RW-11's patch bump is applied with baseline verification green.
   *(Implemented locally 2026-07-28; merge remains pending.)*
5. Baseline artifacts are captured for later comparison.
   *(Metrics recorded locally 2026-07-28; PR screenshot attachments remain
   pending.)*

**RW-14 — Four executable checks, each owned by the phase whose code it
guards.** The rules most likely to be violated silently get teeth rather than
review attention. Phase 0 owns this ledger; no phase closes with its own row
red.

| Check | Enforces | Lands in |
| --- | --- | --- |
| Positive control beside each visibility assertion (RW-7) | FE-22 | Phase 0 |
| Font files present in the generated `ngsw.json` (RW-8) | FE-20 | Phase 1 |
| Switching identity refetches every viewer-scoped resource | FE-4 | Phase 3 |
| Navigating between shell children does not refetch the board | FE-7 | Phase 3 |

The last two require the shell and board store that Phase 3 builds. A check
whose subject does not exist can only be written as a skipped test, and a
skipped test asserts nothing — so each check lands with its code, and Phase 0's
obligation is that this ledger exists and is honored.

The `ngsw.json` row extends `web/scripts/verify-pwa-cache-policy.mjs`, which
already parses the built `ngsw.json`.

## Out Of Scope

Do not, during this rework:

- add a component explorer, state library, utility CSS framework, or new
  workspace package without a proven V1 need;
- change REST endpoints beyond RW-1;
- rename repositories to "clients" while retaining the same duplicated error and
  subscription boilerplate;
- introduce screenshot baselines (FE-23);
- remove server surface (RW-2).

`@axe-core/playwright` is the single new test dependency this rework introduces.

## Baseline Record

Captured after the coordinated Angular 22.0.8 update on 2026-07-28.

- Angular versions: `@angular/common`, `compiler`, `core`, `forms`,
  `platform-browser`, `router`, `service-worker`, `build`, `cli`, and
  `compiler-cli` are all installed at 22.0.8. `ng update` reported that the
  workspace was already in order, with no migrations available.
- Production web build: initial total 701.32 kB raw / 148.81 kB estimated
  transfer; `main` 700.87 kB raw / 148.35 kB estimated transfer; `styles`
  458 bytes raw / 458 bytes estimated transfer. The 700 kB initial warning
  fired by 1.32 kB; the build passed.
- Workspace tests: `@idkdo/shared` 31 files / 100 tests;
  `@idkdo/server` 27 files / 131 tests; `@idkdo/web` 19 files / 116 tests;
  `@idkdo/db` typecheck-backed test script passed.
- End-to-end: `anti-spoil.spec.ts` passed on desktop;
  `core-workflow.spec.ts` passed on desktop and mobile;
  `reservation-lifecycle.spec.ts` passed on desktop; `pwa-smoke.spec.ts`
  passed against the production PWA build. Playwright reported 5 passed.
