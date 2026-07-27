# Atelier Rework — Phase 0 Closure And Phase 1 Foundation

Date: 2026-07-26
Applies To: `web/`, `e2e/`, and the two rework notes named below
Companion to: [the rework plan](2026-07-24-atelier-angular-rework.html) and
[the locked decisions](2026-07-26-atelier-rework-decisions.md)
Delivery: two pull requests, in order — **PR 1 closes the Phase 0 gate**,
**PR 2 delivers Phase 1 Foundation**
Status: ready for implementation

---

## 0. How To Use This Document

You are implementing the first two pull requests of an eight-phase frontend
rework. Everything you need is either in this document or in the four documents
it cites. Read in this order before writing code:

1. [DESIGN.md](../../DESIGN.md) — visual and interaction doctrine, rules `DS-n`.
2. [frontend-architecture.md](../design-docs/frontend-architecture.md) —
   frontend engineering rules, `FE-n`.
3. [the locked decisions](2026-07-26-atelier-rework-decisions.md) — rework-specific
   rulings, `RW-n`.
4. [AGENTS.md](../../AGENTS.md) §8 and §12 — verification commands and the PR
   template obligation.

Rules of engagement:

- **Cite rules, do not re-derive them.** Every task below names the rule it
  satisfies. If your implementation cannot satisfy a named rule, stop and report
  — do not improvise a different rule.
- **Do not widen scope.** Section 6 lists what must not be touched. The
  legacy screens for Event entry, the Event home page, and the Wish panels are
  rebuilt in Phases 2–6, not here.
- **The plan's decisions are closed.** Section 1 lists every decision this plan
  locks, with rationale. Nothing in this document is left to implementer
  judgment. If you find a genuine gap, stop and report it rather than choosing.
- **Verification per pull request** (AGENTS.md §8, RW-12): `pnpm typecheck`,
  `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, and — because both PRs
  touch documentation — `pnpm verify`. `pnpm test:e2e` needs Docker plus
  installed Playwright Chromium.
- **French, with typographic apostrophes.** All user-visible copy is French
  (DS-21) and uses `’` (U+2019), never `'`. The existing code does this; match it.
- **Two pull requests, not one.** RW-12 makes phase boundaries PR boundaries.
  PR 2 does not open until PR 1 is merged.

---

## 1. Decisions This Plan Locks

Numbered `P-n` so review can cite them. `P-1` through `P-4` were decided by the
repository owner on 2026-07-26; the rest are derived from existing rules and
measurements, and are recorded here so no downstream choice remains open.

**P-1 — Scope is Phase 0 closure plus Phase 1 Foundation, as two pull requests.**
Phase 0 is a gate (RW-13) and is only partly satisfied: the documentation
amendments and the locked-decision note landed in commit `255ed02`, but the
anti-spoil repair, the Angular patch bump, and the baseline capture did not.
Phase 1 cannot legally open until they do.

**P-2 — Fonts come from the Fontsource npm packages, copied into the build as
assets.** `@fontsource-variable/fraunces@5.3.0` and
`@fontsource-variable/nunito-sans@5.3.0` become `web` dependencies; an
`angular.json` asset entry copies their pre-subset `latin` and `latin-ext`
variable WOFF2 files to `/fonts/`; `typography.css` declares hand-written
`@font-face` rules against root-absolute URLs. Reproducible through the
lockfile, no binaries in git, no font CDN at runtime (DS-5). Verified working
through pnpm's symlinked `node_modules` — see section 2.4.

**P-3 — RW-14 becomes a per-phase check ledger.** Two of its four checks test a
shell and board store that Phase 3 builds, and one tests fonts that Phase 1
ships; only the RW-7 control can exist in Phase 0. PR 1 amends RW-14 so each
check lands with the code it guards. Exact replacement text in task 3.4.

**P-4 — Atelier's action fills are deepened, and the border token is split in
two.** Measured against DS-3's bar, three mockup roles fail as fills and
boundaries (section 2.3). Therefore: the primary action fill is
`terracotta-deep #a34a2f` (5.87:1 under a white label), the share block's copy
button is `gold-deep #8f6a1e` (4.94:1), Atelier's soft `--palette-line` stays
the *decorative* separator (card edges, row dividers — exempt from WCAG 1.4.11
because the surface itself is identifiable), and a separate
`--border-interactive` at `#a2825f` (3.50:1 on paper, 3.10:1 on canvas) is used
for input and control outlines. Atelier's delicate hairline survives; buttons
read a shade deeper than the mockup.

**P-5 — One focus ring: ink, 3px, 2px offset.** `#3b2e25` against a
terracotta-deep fill is only 2.23:1, so a ring drawn *on* the fill would fail.
The 2px offset places the ring against the page surface instead, where ink
measures 11.39:1 on canvas and 12.88:1 on paper. Any future component that puts
a focusable control directly on a dark fill needs an inverse ring token; none
exists in Phase 1, so none is declared.

**P-6 — Legacy color variables survive in one quarantined file.** The eight old
variables (`--background`, `--surface`, `--text`, `--muted`, `--primary`,
`--primary-hover`, `--border`, `--error`) are still consumed by eight legacy
stylesheets that Phases 2–6 rebuild. They move verbatim into
`web/src/app/shared/ui/styles/legacy-tokens.css`, imported last, with a header
comment naming its deletion condition. Aliasing them onto Atelier tokens is
rejected: it would silently restyle screens whose contrast has not been checked.

**P-7 — The global application chrome is deleted in Phase 1.** `app.html` becomes
a bare `<router-outlet />` and `app.css` is deleted, because the Atelier creation
screen carries its own wordmark and a second brand bar above it would fail the
Phase 1 human-review gate. Consequence, accepted deliberately: the legacy entry,
home, and unavailable screens lose their `42rem` centering container and render
full-width until their own phase rebuilds them. Nothing is released
(RW-3), so an ugly intermediate state costs nothing; a duplicated brand bar in
the screenshot that gates Phase 1 costs review accuracy.

**P-8 — Creation succeeds in place; the share block is local state.** After a
successful create the page stays on `/` and swaps the form for the share block —
transient confirmation stays local component state (FE-18), and this is what the
Atelier mockup shows. The share URL is `${origin}/events/${eventId}`, pointing at
the board route, where the selected-Participant guard forwards a newcomer to
`/entry` (RW-4). The URL is rendered as a real anchor whose text is the URL, so
its accessible name *is* the URL — which keeps the existing
`createEventThroughUi` e2e helper working unchanged.

**P-9 — Primitive shapes: two components, three class contracts, one
directive.** `Field` and `InlineMessage` are components (they own structure and
ARIA wiring). `.surface-card` and `.visually-hidden` are class contracts (no
behavior to own). The button and link treatment is an attribute directive
`[appButton]` over native `<button>`/`<a>` backed by classes in
`shared/ui/styles/controls.css`: a directive keeps native semantics (DS-10),
gives typed variants, and avoids a wrapper component per element type. Angular
directives cannot carry `styleUrl`, which is why the classes are global — and
global CSS therefore contains role-neutral control classes only, never feature
selectors.

**P-10 — Failures are decoded once; `web` gains no `zod` dependency.** Actions
call `schema.parse(...)` inside their `try` block and let `decodeApiFailure`
classify everything that is thrown, per FE-14. The decoder recognizes a schema
failure structurally (an object with an `issues` array), not by class identity,
because `web` does not depend on `zod` directly — it only re-uses schemas
exported by `@idkdo/shared`. Its spec proves the branch against a real Zod error
produced by a real shared schema.

**P-11 — The initial bundle budget warning pre-exists and is not Phase 1's to
fix.** Measured today: 701.10 kB raw, 1.10 kB over the 700 kB
`maximumWarning`, with every route eager. `maximumError` is 1 MB, so the build
passes. Phase 1's gate is that raw initial bundle grows by no more than 5 kB
(fonts are assets and do not count). Converting routes to lazy `loadComponent`
belongs to Phase 3, where RW-4 introduces the lazy shell; do not do it here.

**P-12 — DS-4 gets teeth.** Phase 1 adds
`web/scripts/verify-design-tokens.mjs`, which fails when a stylesheet outside
the foundations layer contains a raw color literal or references a
`--palette-*` value. It carries an explicit allowlist of the eight not-yet-rebuilt
legacy stylesheets, and fails if an allowlisted file no longer exists, so the
list cannot rot. This is the same reasoning RW-14 applies to the other silent
rules.

**P-13 — Icons are a typed geometry registry, not markup.** One
`icon-shapes.ts` maps a name union to `paths`/`circles`/`rects` arrays; the
`Icon` component renders them with `@for` loops. No inline sprite (DS-6), no
`innerHTML`, no sanitizer bypass. Phase 1 vendors exactly six names:
`arrow-right`, `check-circle`, `circle-alert`, `copy`, `gift`, `link`. The Lucide
ISC license is fetched verbatim from the Lucide repository into
`web/src/app/shared/ui/icon/LUCIDE-LICENSE.txt` — do not retype it from memory.

**P-14 — The Event name field label does not change.** The Atelier mockup says
"Le nom de votre événement"; the app says "Nom de l’événement" and four e2e
specs locate it by that label. Keeping it avoids churn in a helper this plan
otherwise leaves alone, and loses nothing (DS-1 governs hierarchy, not wording).
Likewise the submit label stays "Créer l’événement".

**P-15 — PWA manifest and browser theme color stay legacy until Phase 7.** The
plan assigns manifest/theme-color work to Phase 7. So `index.html`'s
`theme-color="#315c46"` (pine green) will clash with the cream canvas during
Phases 1–6. This is expected, not a bug; reviewers should not file it.

---

## 2. Measured Baseline — 2026-07-26

Everything in this section was measured today in this repository. Re-verify
rather than trusting it if you are reading this later (RW-9's discipline).

### 2.1 Environment and versions

| Item | Measured |
| --- | --- |
| Node | 24.17.0 — satisfies `engines: >=24.15 <25` |
| pnpm | 11.5.0 — matches `packageManager` |
| `@angular/{common,core,forms,router,service-worker,compiler,compiler-cli,platform-browser}` | 22.0.2 installed |
| `@angular/{build,cli}` | 22.0.3 installed |
| Latest 22.0 patch on npm | **22.0.8** for all of the above |
| `22.1.0-rc.0` | on `next`; **not** a target (RW-11) |
| Vitest | 4.1.8 |
| `@axe-core/playwright` latest | 4.12.1 — Phase 7, not now |

### 2.2 Green baseline

`pnpm typecheck && pnpm lint && pnpm test` inside `web/` exits 0.

| Metric | Baseline |
| --- | --- |
| Unit test files / tests | 19 / 116, all passing |
| Initial bundle, raw | 701.10 kB |
| Initial bundle, estimated transfer | 148.54 kB |
| `main` chunk raw | 700.64 kB |
| `styles` chunk raw | 458 B |
| Budget state | `maximumWarning` 700 kB exceeded by 1.10 kB (warning, not error) |
| PWA cache policy check | passes |

### 2.3 Contrast audit of the fills and boundaries

RW-10 audited the *text* roles. These are the fill and boundary roles it did not
cover, measured against `--surface: #fffdf8` (paper) and `--bg: #f6eee3`
(canvas). This is the evidence behind P-4.

| Mockup value | Used as | Measured | Bar | Verdict |
| --- | --- | --- | --- | --- |
| white on `#c05b3c` | primary button label, 15px/800 | 4.37:1 | 4.5:1 | fails |
| white on `#b98726` | share copy button label, 13px/800 | 3.20:1 | 4.5:1 | fails |
| `#e7dbc9` on paper | input border | 1.34:1 | 3:1 | fails |
| white on `#c78f2d` | avatar initials | 2.84:1 | 4.5:1 | fails (Phase 2 problem) |

Replacements adopted, all measured:

| Token value | Role | Measured |
| --- | --- | --- |
| `#a34a2f` terracotta-deep | white label on fill | 5.87:1 |
| `#a34a2f` terracotta-deep | action text on paper / canvas | 5.77:1 / 5.10:1 |
| `#8f6a1e` gold-deep | white label on fill | 4.94:1 |
| `#8f6a1e` gold-deep | text on paper | 4.86:1 |
| `#a2825f` line-strong | interactive boundary on paper / canvas | 3.50:1 / 3.10:1 |
| `#756453` ink-soft | muted text on paper / canvas | 5.58:1 / 4.93:1 |
| `#3b2e25` ink | body text on paper / canvas | 12.88:1 / 11.39:1 |
| `#3b2e25` ink | focus ring against paper / canvas | 12.88:1 / 11.39:1 |
| `#3b2e25` ink | focus ring against terracotta-deep fill | **2.23:1** — hence P-5's offset |
| `#a33a2e` danger | error text on paper | 6.45:1 |
| `#4f6853` pine | reserved text on paper | 6.01:1 |
| `#4f6853` pine on `#e6ecdf` | reserved text on its wash | 5.07:1 |

### 2.4 The RW-8 failure mode, reproduced and fixed

Run today against a temporary asset entry and a symlinked
`node_modules/@fontsource-variable/fraunces`:

- The Angular asset copier **does** follow pnpm's symlink; both
  `fraunces-latin-wght-normal.woff2` (36 kB) and
  `fraunces-latin-ext-wght-normal.woff2` (33 kB) landed in
  `dist/web/browser/fonts/`, unhashed. The brace glob
  `*-{latin,latin-ext}-wght-normal.woff2` matched exactly those two.
- With the current `ngsw-config.json`, `ngsw.json` contained **no** font URL —
  RW-8's silent failure, confirmed empirically rather than inferred.
- Adding `/fonts/**` to the `app` asset group put both files into the `app`
  prefetch group and the `hashTable`.

The experiment was reverted; the repository is clean.

### 2.5 RW-7 site audit — one correction

RW-7 lists four sites keyed on `.purchase-coordination` with a bare count-0
assertion. Checked today, **three** of the four are bare; the fourth already has
its positive control:

| Site | State today |
| --- | --- |
| `e2e/tests/anti-spoil.spec.ts:41` | bare `toHaveCount(0)` — needs a control |
| `e2e/tests/core-workflow.spec.ts:66` | bare `toHaveCount(0)` — needs a control |
| `event-wishes-panel.spec.ts` ≈358 (`own reserved Wishes`) | bare `toBeNull()` — needs a control |
| `event-wishes-panel.spec.ts` ≈105 (`renders Réserver only for…`) | **already paired**: the same test asserts Bob's group *has* a `.purchase-coordination` node |

PR 1 therefore repairs three sites and corrects RW-7's text. The rename
experiment in task 3.2 still covers all four.

Useful fact for writing the controls: `.purchase-coordination` is rendered for
**every** Wish whose `purchaseCoordination.kind === "visible"`, reserved or not —
an unreserved foreign Wish renders it around the "Réserver" button. A positive
control therefore needs only a *foreign* Wish, not a reserved one.

---

## 3. PR 1 — Close The Phase 0 Gate

Branch from `main`. Suggested branch name: `chore/atelier-phase-0-gate`.
Conventional Commit type: `chore` (it bumps dependencies and repairs tests).

### 3.1 Task A — Add the missing positive controls (RW-7, FE-22)

**A1 — `e2e/tests/anti-spoil.spec.ts`.** Bob and Carol currently own no Wishes,
so Alice sees no foreign Wish. Add one, then assert on it.

After the Carol block that clicks "Participer" (around line 34) and before
`await alice.page.reload();`, add a foreign Wish owned by Bob:

```ts
const bobWish = `Écharpe ${Date.now()}`;
await addWish(bob.page, bobWish);
```

Then, after the existing negative assertion at line 41, add the control:

```ts
await expect(aliceWish.locator(".purchase-coordination")).toHaveCount(0);
// Positive control (FE-22): the same locator must be present on a Wish Alice
// does not own, so renaming the class fails this test instead of satisfying it.
const aliceViewOfBobWish = wishItemInGroup(alice.page, "Bob", bobWish);
await expect(aliceViewOfBobWish).toBeVisible();
await expect(
  aliceViewOfBobWish.locator(".purchase-coordination"),
).toHaveCount(1);
```

Alice's page is reloaded and `openAllLists` is called just above, so Bob's Wish
is in the response. Do not reorder the existing network-body assertions; they
must keep running against the same collected responses.

**A2 — `e2e/tests/core-workflow.spec.ts`.** Bob owns no Wish here either. After
line 51 (`…"Bob"…getByText("vous")`), add:

```ts
const bobWish = "Écharpe grise";
await addWish(bob.page, bobWish);
```

Then after the negative assertion at line 66:

```ts
await expect(aliceOwnWish.locator(".purchase-coordination")).toHaveCount(0);
// Positive control (FE-22).
const aliceViewOfBobWish = wishItemInGroup(alice.page, "Bob", bobWish);
await expect(aliceViewOfBobWish).toBeVisible();
await expect(
  aliceViewOfBobWish.locator(".purchase-coordination"),
).toHaveCount(1);
```

`addWish` asserts the Wish is visible on Bob's own list, and Alice reloads at
line 61, so the ordering is safe. Note that `addWish` operates on the currently
visible own-list panel — call it while Bob's page is on his own list, which it is
after `refreshAllLists` only if you switch back; if the helper fails, switch Bob
to his own list first with the existing tab control rather than inventing a new
helper.

**A3 — `web/src/app/features/wishes/components/event-wishes-panel/event-wishes-panel.spec.ts`,
the `own reserved Wishes` describe block (≈line 353).** The fixture currently
renders one own Wish. Add the foreign reserved Wish that already exists in this
spec file's fixtures (`bobWish`) to the same response and assert its coordination
node is present:

```ts
getEventWishes.mockReturnValue(of({ wishes: [ownReservedWish, bobWish] }));

const { element } = await createPanel();
const aliceGroup = groupFor(element, alice.id);

expect(aliceGroup.querySelector(".purchase-coordination")).toBeNull();
expect(aliceGroup.querySelector("app-reservation-coordination")).toBeNull();
expect(aliceGroup.textContent).not.toContain("Participer");
expect(aliceGroup.textContent).not.toContain("Réserver");
// Positive control (FE-22): same locator, viewer who may see coordination.
expect(
  groupFor(element, bob.id).querySelector(".purchase-coordination"),
).not.toBeNull();
```

Reuse the fixtures already defined at the top of the file; do not introduce new
ones.

**A4 — Leave the ≈105 site alone.** It is already paired (section 2.5). Do not
add a redundant assertion.

### 3.2 Task B — Prove the controls fail on a rename (RW-13 item 2)

RW-13 requires the control to be *proven*, not assumed.

1. Rename the class in the template only:
   `web/src/app/features/wishes/components/event-wishes-panel/event-wishes-panel.html`,
   `class="purchase-coordination"` → `class="wish-coordination"`. Rename it in
   `event-wishes-panel.css` too so the build stays clean.
2. Run `pnpm --filter @idkdo/web test` and the two e2e specs
   (`pnpm --filter @idkdo/e2e exec playwright test anti-spoil core-workflow`).
3. **Expected: four failures** — the three new controls plus the pre-existing
   pair at ≈105. If any spec passes, its control is not real; fix it and repeat.
4. Revert the rename with `git checkout` on those two files. The rename itself
   belongs to Phase 4, not here.
5. Record the observed failure output in the PR body under **Verification**.
   This is the artifact that proves the gate item; a claim without it does not
   close RW-13 item 2.

### 3.3 Task C — Angular 22.0.8 and migrations (RW-11, RW-13 item 4)

1. In `web/package.json`, move every Angular specifier to `^22.0.8`:
   `@angular/common`, `@angular/compiler`, `@angular/core`, `@angular/forms`,
   `@angular/platform-browser`, `@angular/router`, `@angular/service-worker`
   (dependencies) and `@angular/build`, `@angular/cli`, `@angular/compiler-cli`
   (devDependencies). Bump them **together**; a split version set is the failure
   mode this task exists to avoid.
2. `pnpm install`, then `pnpm --filter @idkdo/web exec ng update --migrate-only`
   for the framework packages if `ng update` reports pending migrations. Patch
   releases usually have none. Report what ran, including "no migrations
   available", rather than leaving it ambiguous.
3. Do not touch `typescript`, `vitest`, `jsdom`, `zod`, `rxjs`, or
   `@signality/core`. Out of scope.
4. Commit the lockfile change. CI installs with `--frozen-lockfile`.

### 3.4 Task D — Amend RW-14 into a ledger (P-3)

In [the locked decisions](2026-07-26-atelier-rework-decisions.md), replace the
whole RW-14 block with:

```md
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
```

Also in the same file:

- **RW-7**: change "Four sites are currently keyed on" to "Four sites are keyed
  on", and annotate the `event-wishes-panel.spec.ts:105` entry as already paired
  — the repair covers the other three, and the rename experiment covers all
  four. Keep the paragraph's conclusion intact.
- **RW-13**: mark items 2, 4, and 5 `*(Done 2026-07-26 — PR 1.)*` in the same
  style as the existing item 1 and item 3 annotations, once the work is actually
  done.

`pnpm verify` must pass afterwards. Watch two traps in
`scripts/verify-docs.mjs`: an inline-code Markdown path is resolved relative to
the containing file — so write cross-document references as links, the way this
plan does — and `git diff --check` rejects trailing whitespace.

### 3.5 Task E — Capture the baseline (RW-13 item 5)

Append a `## Baseline Record` section to
[the locked decisions](2026-07-26-atelier-rework-decisions.md) — it is the
disposable note that dies with the rework, so the record belongs there rather
than in a durable document. Record, from your own run after task C:

- `pnpm --filter @idkdo/web build` output: initial raw and transfer totals, the
  `main` and `styles` chunk sizes, and whether the budget warning fired.
- `pnpm test` output: test-file and test counts per workspace.
- `pnpm test:e2e` result: pass/fail per spec file.
- Installed Angular versions after the bump.

Screenshots: capture the creation, entry, home (own list and all lists), and
unavailable screens at 390 and 1280 CSS pixels and attach them **to the pull
request**, not to the repository. FE-23 forbids a screenshot baseline suite;
binaries in git would be the first step toward one. If you use the repository's
existing media-branch convention for PR media, follow it.

### 3.6 PR 1 gate

Do not open PR 2 until all of these hold:

- [ ] Three positive controls added; the fourth site confirmed already paired.
- [ ] Rename experiment run, **four** failures observed and pasted into the PR
      body, rename reverted.
- [ ] Angular framework, build, and CLI packages all at 22.0.8; migration status
      reported explicitly.
- [ ] RW-14 replaced with the ledger; RW-7 corrected; RW-13 items 2, 4, 5
      annotated Done.
- [ ] Baseline record appended; screenshots attached to the PR.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`,
      `pnpm verify` all green.
- [ ] Every section of [the PR template](../../.github/PULL_REQUEST_TEMPLATE.md)
      filled (AGENTS.md §12).

---

## 4. PR 2 — Phase 1 Foundation

Branch from `main` after PR 1 merges. Suggested branch:
`feat/atelier-phase-1-foundation`. Conventional Commit type: `feat`.

Goal, from the rework plan: seed only the foundations the creation flow needs,
and rebuild that one screen in the Atelier language. Not a component library
(DS-19).

### 4.1 File manifest

Create:

```txt
web/src/app/shared/ui/styles/tokens.css
web/src/app/shared/ui/styles/typography.css
web/src/app/shared/ui/styles/reset.css
web/src/app/shared/ui/styles/controls.css
web/src/app/shared/ui/styles/utilities.css
web/src/app/shared/ui/styles/legacy-tokens.css
web/src/app/shared/ui/icon/icon-shapes.ts
web/src/app/shared/ui/icon/icon-shapes.spec.ts
web/src/app/shared/ui/icon/icon.ts
web/src/app/shared/ui/icon/icon.html
web/src/app/shared/ui/icon/icon.css
web/src/app/shared/ui/icon/icon.spec.ts
web/src/app/shared/ui/icon/LUCIDE-LICENSE.txt
web/src/app/shared/ui/button/button.ts
web/src/app/shared/ui/button/button.spec.ts
web/src/app/shared/ui/field/field.ts
web/src/app/shared/ui/field/field.html
web/src/app/shared/ui/field/field.css
web/src/app/shared/ui/field/field.spec.ts
web/src/app/shared/ui/inline-message/inline-message.ts
web/src/app/shared/ui/inline-message/inline-message.html
web/src/app/shared/ui/inline-message/inline-message.css
web/src/app/shared/ui/inline-message/inline-message.spec.ts
web/src/app/core/http/api-failure.ts
web/src/app/core/http/decode-api-failure.ts
web/src/app/core/http/decode-api-failure.spec.ts
web/src/app/features/events/data-access/create-event-action.ts
web/src/app/features/events/data-access/create-event-action.spec.ts
web/scripts/verify-design-tokens.mjs
```

Modify:

```txt
web/package.json                  # two font deps, one verify script
web/angular.json                  # two asset entries
web/ngsw-config.json              # /fonts/** in the app asset group
web/scripts/verify-pwa-cache-policy.mjs   # font + external-font assertions
web/src/index.html                # font preloads
web/src/styles.css                # becomes imports only
web/src/app/app.ts                # drop styleUrl
web/src/app/app.html              # bare router-outlet
web/src/app/app.spec.ts           # assert the outlet, not the brand
web/src/app/app.routes.ts         # document title on "/"
web/src/app/app.routes.spec.ts    # assert the title
web/src/app/features/events/data-access/event-repository.ts       # remove createEvent
web/src/app/features/events/data-access/event-repository.spec.ts  # remove its cases
web/src/app/features/events/pages/create-event-page/*             # rebuilt
e2e/tests/core-workflow.spec.ts   # one navigation step (see 4.15)
```

Delete:

```txt
web/src/app/app.css
```

### 4.2 The font pipeline (DS-5, FE-20, RW-8, P-2)

**`web/package.json` dependencies** — add, keeping alphabetical order:

```json
"@fontsource-variable/fraunces": "^5.3.0",
"@fontsource-variable/nunito-sans": "^5.3.0",
```

**`web/angular.json`** — replace the `assets` array of the build target:

```json
"assets": [
  { "glob": "**/*", "input": "public" },
  {
    "glob": "*-{latin,latin-ext}-wght-normal.woff2",
    "input": "node_modules/@fontsource-variable/fraunces/files",
    "output": "fonts"
  },
  {
    "glob": "*-{latin,latin-ext}-wght-normal.woff2",
    "input": "node_modules/@fontsource-variable/nunito-sans/files",
    "output": "fonts"
  }
]
```

Four files result, ~126 kB total: `fraunces-latin-wght-normal.woff2`,
`fraunces-latin-ext-wght-normal.woff2`,
`nunito-sans-latin-wght-normal.woff2`,
`nunito-sans-latin-ext-wght-normal.woff2`. Use the `wght`-only files, not
`full`/`opsz`/`soft`/`wonk`/`wdth`/`ytlc`: the design uses weight variation only,
and the other axis files are larger for nothing. No italics.

**`web/ngsw-config.json`** — add `"/fonts/**"` to the `app` asset group's
`files`, keeping it in the prefetch group so the offline shell renders in its
real typefaces on first load:

```json
"files": [
  "/favicon.ico",
  "/index.html",
  "/manifest.webmanifest",
  "/*.css",
  "/*.js",
  "/fonts/**"
]
```

**`web/src/index.html`** — preload the two `latin` files only, both of which are
used above the fold on the creation screen (Fraunces for the wordmark and
heading, Nunito Sans for everything else). `crossorigin` is required even
same-origin:

```html
<link
  rel="preload"
  href="/fonts/nunito-sans-latin-wght-normal.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
<link
  rel="preload"
  href="/fonts/fraunces-latin-wght-normal.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

Do not touch `theme-color` (P-15).

**`web/src/app/shared/ui/styles/typography.css`** — hand-written faces against
root-absolute URLs. Root-absolute matters: Angular leaves `/`-prefixed URLs
alone, so the files stay at `/fonts/…` instead of being rewritten into hashed
`/media/…` paths, which is what makes the `ngsw-config.json` pattern above
match. The `unicode-range` values are copied verbatim from the Fontsource
stylesheets — do not shorten them.

```css
/* Self-hosted variable subsets (DS-5). Files are copied out of the Fontsource
   packages by the angular.json asset entries; keep the URLs root-absolute so
   the build does not rewrite them into hashed /media/ paths, which the service
   worker asset patterns would then miss (FE-20, RW-8). */

@font-face {
  font-family: "Fraunces";
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url("/fonts/fraunces-latin-wght-normal.woff2") format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: "Fraunces";
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url("/fonts/fraunces-latin-ext-wght-normal.woff2") format("woff2");
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7,
    U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF,
    U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: "Nunito Sans";
  font-style: normal;
  font-display: swap;
  font-weight: 200 1000;
  src: url("/fonts/nunito-sans-latin-wght-normal.woff2") format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
    U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: "Nunito Sans";
  font-style: normal;
  font-display: swap;
  font-weight: 200 1000;
  src: url("/fonts/nunito-sans-latin-ext-wght-normal.woff2") format("woff2");
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7,
    U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF,
    U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
```

Attribution: both families are OFL and both Fontsource packages ship their
`LICENSE` file, so nothing needs vendoring. Mention the two packages and their
license in the PR body.

### 4.3 `tokens.css` — the foundations layer (DS-2, DS-3, DS-4, P-4, P-5)

This is the only stylesheet permitted to contain raw color literals, enforced by
task 4.13. Every value below is either from the Atelier mockup or from the
measurements in section 2.3.

```css
/* Atelier foundations. The palette layer is private to this file (DS-4):
   feature and primitive stylesheets consume the role tokens only, and
   web/scripts/verify-design-tokens.mjs fails a build that breaks that. */
:root {
  color-scheme: light;

  /* ---------- Private palette. Do not reference outside this file. ---------- */
  --palette-cream: #f6eee3;
  --palette-paper: #fffdf8;
  --palette-paper-warm: #fffaf0;
  --palette-ink: #3b2e25;
  --palette-ink-soft: #756453;
  --palette-line: #e7dbc9;
  --palette-line-soft: #f0e6d7;
  --palette-line-strong: #a2825f;
  --palette-terracotta: #c05b3c;
  --palette-terracotta-deep: #a34a2f;
  --palette-terracotta-darkest: #8d3f28;
  --palette-terracotta-wash: #f9efe0;
  --palette-pine: #4f6853;
  --palette-pine-wash: #e6ecdf;
  --palette-gold: #b98726;
  --palette-gold-deep: #8f6a1e;
  --palette-gold-wash: #f7ead0;
  --palette-danger: #a33a2e;
  --palette-white: #ffffff;

  /* ---------- Color roles (DS-2, DS-4) ---------- */
  --color-text: var(--palette-ink);
  --color-text-muted: var(--palette-ink-soft);
  --color-text-on-fill: var(--palette-white);
  --color-action: var(--palette-terracotta-deep);
  --color-action-hover: var(--palette-terracotta-darkest);
  --color-accent: var(--palette-gold-deep);
  --color-danger: var(--palette-danger);
  /* First consumer Phase 4; named here because DS-4 fixes the vocabulary. */
  --color-reserved: var(--palette-pine);

  /* ---------- Surfaces ---------- */
  --surface-canvas: var(--palette-cream);
  --surface-card: var(--palette-paper);
  --surface-accent: var(--palette-gold-wash);
  --surface-action-wash: var(--palette-terracotta-wash);
  --surface-reserved: var(--palette-pine-wash);
  /* First consumer Phase 4. */
  --surface-own-list: var(--palette-paper-warm);

  /* ---------- Borders ---------- */
  --border-subtle: var(--palette-line);
  --border-divider: var(--palette-line-soft);
  --border-interactive: var(--palette-line-strong);

  /* ---------- Focus (DS-12, P-5) ---------- */
  --focus-ring: 3px solid var(--palette-ink);
  --focus-ring-offset: 2px;

  /* ---------- Typography (DS-5) ---------- */
  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Nunito Sans", system-ui, sans-serif;
  --font-size-2xs: 0.75rem;
  --font-size-xs: 0.8125rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 0.9375rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.0625rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.625rem;
  --font-size-3xl: 1.9375rem;
  --font-weight-regular: 400;
  --font-weight-display: 600;
  --font-weight-bold: 700;
  --font-weight-heavy: 800;
  --line-height-tight: 1.2;
  --line-height-normal: 1.55;
  --letter-spacing-display: -0.01em;
  --letter-spacing-label: 0.07em;

  /* ---------- Space, radius, shadow ---------- */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --radius-sm: 0.5rem;
  --radius-md: 0.8125rem;
  --radius-lg: 1rem;
  --radius-pill: 99px;
  --shadow-card: 0 2px 12px rgba(59, 46, 37, 0.07);

  /* ---------- Motion (DS-14) ---------- */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --easing-standard: cubic-bezier(0.2, 0.6, 0.2, 1);

  /* ---------- Layers ---------- */
  --layer-rail: 4;
  --layer-topbar: 5;
  --layer-tabbar: 6;

  /* ---------- Sizing ---------- */
  --control-min-size: 2.75rem; /* 44px, DS-15 */
  --content-width-solo: 31.25rem;
  --content-width-narrow: 47.5rem;
  --content-width-board: 73.75rem;
}

/* Desktop breakpoint is 900px, matching the Atelier mockup. Custom properties
   cannot be used in media queries, so the literal is repeated at each use. */
```

Rules for later phases, stated here so they are not re-litigated: add a role
token when a screen consumes it, never speculatively; never add a second name
for an existing role; if a contrast fix is needed, change the palette value, not
the feature stylesheet.

### 4.4 `reset.css`

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

html,
body {
  margin: 0;
}

body {
  background: var(--surface-canvas);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-normal);
  min-height: 100vh;
}

h1,
h2,
h3 {
  font-family: var(--font-display);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-display);
  line-height: var(--line-height-tight);
  margin: 0;
}

p {
  margin: 0;
}

a {
  color: var(--color-action);
}

button,
input,
textarea,
select {
  font: inherit;
  color: inherit;
}

button,
input,
textarea,
select,
a {
  touch-action: manipulation;
}

:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

/* DS-14: removed under reduced motion, not shortened. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
```

Note the deliberate `margin: 0` on `p`, `h1`–`h3`: Atelier's layouts are gap-driven,
and leaving default margins in place is the fastest route to spacing drift.

### 4.5 `controls.css` and `utilities.css`

`controls.css` holds the class contract the `[appButton]` directive applies, plus
the native text-input treatment. It is global because directives cannot carry
styles (P-9). It must contain role-neutral control classes only — no feature
selectors, ever.

```css
/* Button and link treatment. Applied by the [appButton] directive; do not hand-
   write these class names in a template. */
.control {
  align-items: center;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  cursor: pointer;
  display: inline-flex;
  font-family: var(--font-body);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-heavy);
  gap: var(--space-2);
  justify-content: center;
  line-height: 1;
  min-height: var(--control-min-size);
  padding: var(--space-3) var(--space-5);
  text-decoration: none;
  white-space: nowrap;
}

.control:disabled,
.control[aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.65;
}

.control-primary {
  background: var(--color-action);
  color: var(--color-text-on-fill);
}

.control-primary:hover:not(:disabled) {
  background: var(--color-action-hover);
}

.control-outline {
  background: var(--surface-card);
  border-color: var(--border-interactive);
  color: var(--color-text);
}

.control-outline:hover:not(:disabled) {
  background: var(--surface-canvas);
}

.control-accent {
  background: var(--color-accent);
  color: var(--color-text-on-fill);
}

.control-sm {
  font-size: var(--font-size-xs);
  min-height: 2.375rem;
  padding: var(--space-2) var(--space-4);
}

.control-block {
  width: 100%;
}

/* Native text controls. */
.text-control {
  background: var(--surface-card);
  border: 1.5px solid var(--border-interactive);
  border-radius: var(--radius-md);
  color: var(--color-text);
  min-height: var(--control-min-size);
  padding: var(--space-3) var(--space-4);
  width: 100%;
}

.text-control:focus {
  border-color: var(--color-action);
}

.text-control[aria-invalid="true"] {
  border-color: var(--color-danger);
}
```

`.control-sm` intentionally undercuts 44px, matching the mockup's 38px small
control. DS-15's 44px floor applies to the primary touch targets; a small
control is only permitted where it sits beside a larger one with generous
spacing. The share block's copy button is the only Phase 1 use, and it sits in a
row of its own with 8px gaps — check it at 320px during review and promote it to
the default size if it feels cramped.

`utilities.css` — layout-only, plus the two class contracts that have no
component (P-9):

```css
.visually-hidden {
  border: 0;
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.surface-card {
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-5);
}
```

`legacy-tokens.css` — the quarantine from P-6, copied verbatim from today's
`styles.css`:

```css
/* Legacy tokens. Consumed only by screens the Atelier rework has not rebuilt
   yet: Event entry (Phase 2), Event home and Wish panels (Phases 3-6), Event
   unavailable (Phase 7). Delete this file with its last consumer; do not add to
   it, and do not alias these names onto Atelier tokens - their contrast has not
   been checked against the cream canvas. */
:root {
  --background: #f8faf7;
  --surface: #ffffff;
  --text: #162019;
  --muted: #4c5d53;
  --primary: #315c46;
  --primary-hover: #244735;
  --border: #c8d2cb;
  --error: #a51d2d;
}
```

`web/src/styles.css` becomes imports only, in this order — tokens first because
everything else resolves against them, legacy last so it cannot shadow a role
token:

```css
@import "./app/shared/ui/styles/tokens.css";
@import "./app/shared/ui/styles/typography.css";
@import "./app/shared/ui/styles/reset.css";
@import "./app/shared/ui/styles/controls.css";
@import "./app/shared/ui/styles/utilities.css";
@import "./app/shared/ui/styles/legacy-tokens.css";
```

The old `:root` block, the `Inter` font stack, the `*`/`body`/`button, input`
rules, and the hard-coded `:focus-visible` outline are all deleted from
`styles.css` — `reset.css` owns them now.

### 4.6 The `Icon` primitive (DS-6, P-13)

`icon-shapes.ts` — geometry only, no Angular. Data copied from the Atelier
sprite at
`docs/design-explorations/2026-07-20-ui-propositions/06-atelier/_sprite.svg`
(symbols `i-gift`, `i-check-circle`, `i-circle-alert`, `i-copy`, `i-link`,
`i-arrow-right`). Copy the `d` strings exactly; do not re-draw them.

```ts
export type IconName =
  | "arrow-right"
  | "check-circle"
  | "circle-alert"
  | "copy"
  | "gift"
  | "link";

export type IconCircle = {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
};

export type IconRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rx: number;
};

export type IconGeometry = {
  readonly paths: readonly string[];
  readonly circles: readonly IconCircle[];
  readonly rects: readonly IconRect[];
};

function geometry(
  paths: readonly string[],
  circles: readonly IconCircle[] = [],
  rects: readonly IconRect[] = [],
): IconGeometry {
  return { paths, circles, rects };
}

// Lucide, ISC licensed. See LUCIDE-LICENSE.txt beside this file.
export const iconShapes: Readonly<Record<IconName, IconGeometry>> = {
  "arrow-right": geometry(["M5 12h14", "m12 5 7 7-7 7"]),
  "check-circle": geometry(["M21.801 10A10 10 0 1 1 17 3.335", "m9 11 3 3L22 4"]),
  "circle-alert": geometry(["M12 8v4", "M12 16h.01"], [{ cx: 12, cy: 12, r: 10 }]),
  copy: geometry(
    ["M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"],
    [],
    [{ x: 8, y: 8, width: 14, height: 14, rx: 2 }],
  ),
  gift: geometry(
    [
      "M12 8v13",
      "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7",
      "M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5",
    ],
    [],
    [{ x: 3, y: 8, width: 18, height: 4, rx: 1 }],
  ),
  link: geometry([
    "M9 17H7A5 5 0 0 1 7 7h2",
    "M15 7h2a5 5 0 1 1 0 10h-2",
    "M8 12h8",
  ]),
};
```

`icon.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

import { iconShapes, type IconName } from "./icon-shapes";

export type IconSize = "sm" | "md" | "lg" | "xl";

@Component({
  selector: "app-icon",
  templateUrl: "./icon.html",
  styleUrl: "./icon.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  /** Decorative by default. Pass a label only when the icon carries meaning
      no adjacent text already carries (DS-6). */
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>("md");
  readonly label = input<string | null>(null);

  protected readonly geometry = computed(() => iconShapes[this.name()]);
  protected readonly sizeClass = computed(() => `icon-${this.size()}`);
}
```

`icon.html` — no `@switch`, so no reliance on template type narrowing:

```html
<svg
  class="icon"
  [class]="sizeClass()"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  focusable="false"
  [attr.role]="label() ? 'img' : null"
  [attr.aria-label]="label()"
  [attr.aria-hidden]="label() ? null : 'true'"
>
  @for (rect of geometry().rects; track $index) {
    <rect
      [attr.x]="rect.x"
      [attr.y]="rect.y"
      [attr.width]="rect.width"
      [attr.height]="rect.height"
      [attr.rx]="rect.rx"
    />
  }
  @for (circle of geometry().circles; track $index) {
    <circle [attr.cx]="circle.cx" [attr.cy]="circle.cy" [attr.r]="circle.r" />
  }
  @for (path of geometry().paths; track $index) {
    <path [attr.d]="path" />
  }
</svg>
```

`icon.css`:

```css
:host {
  display: inline-flex;
}

.icon {
  flex: none;
  height: 1.125rem;
  width: 1.125rem;
}

.icon-sm {
  height: 0.9375rem;
  width: 0.9375rem;
}

.icon-lg {
  height: 1.375rem;
  width: 1.375rem;
}

.icon-xl {
  height: 2.5rem;
  stroke-width: 1.5;
  width: 2.5rem;
}
```

### 4.7 `Field` and `InlineMessage`

**`Field`** projects a native control and owns the label, hint, and error
structure. It does **not** set attributes on the projected control — the caller
binds `aria-describedby` and `aria-invalid` explicitly, because reaching into
projected content to mutate it is exactly the kind of cleverness that makes
accessibility bugs invisible. The id contract is fixed and documented so callers
cannot guess wrong: hint is `{controlId}-hint`, error is `{controlId}-error`.

```ts
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
  selector: "app-field",
  templateUrl: "./field.html",
  styleUrl: "./field.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Field {
  /** Must match the id of the projected control. */
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
}
```

```html
<div class="field">
  <label class="field-label" [attr.for]="controlId()">{{ label() }}</label>
  @if (hint()) {
    <p class="field-hint" [id]="controlId() + '-hint'">{{ hint() }}</p>
  }
  <ng-content />
  @if (error()) {
    <p class="field-error" [id]="controlId() + '-error'">{{ error() }}</p>
  }
</div>
```

```css
.field {
  display: grid;
  gap: var(--space-2);
}

.field-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-heavy);
}

.field-hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.field-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}
```

The field error is a plain paragraph referenced by `aria-describedby`, not a
live region: it appears when the control is touched and invalid, and a live
region would double-announce it alongside the control's own description.

**`InlineMessage`** carries operation-level feedback. `danger` gets
`role="alert"`; the others get `role="status"`, so a success message is
announced without interrupting.

```ts
import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-shapes";

export type InlineMessageTone = "info" | "success" | "danger";

@Component({
  selector: "app-inline-message",
  imports: [Icon],
  templateUrl: "./inline-message.html",
  styleUrl: "./inline-message.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineMessage {
  readonly tone = input<InlineMessageTone>("info");

  protected readonly role = computed(() =>
    this.tone() === "danger" ? "alert" : "status",
  );
  protected readonly icon = computed<IconName>(() =>
    this.tone() === "success" ? "check-circle" : "circle-alert",
  );
}
```

```html
<p class="inline-message" [class]="'tone-' + tone()" [attr.role]="role()">
  <app-icon [name]="icon()" size="sm" />
  <span><ng-content /></span>
</p>
```

```css
.inline-message {
  align-items: flex-start;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  display: flex;
  font-size: var(--font-size-sm);
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
}

.tone-info {
  background: var(--surface-card);
  color: var(--color-text);
}

.tone-success {
  background: var(--surface-reserved);
  color: var(--color-reserved);
}

.tone-danger {
  background: var(--surface-card);
  color: var(--color-danger);
}
```

**`[appButton]`** — host-class directive over native elements:

```ts
import { Directive, computed, input } from "@angular/core";

export type ButtonVariant = "primary" | "outline" | "accent";
export type ButtonSize = "md" | "sm";

@Directive({
  selector: "button[appButton], a[appButton]",
  host: { "[class]": "classes()" },
})
export class Button {
  readonly variant = input<ButtonVariant>("primary");
  readonly size = input<ButtonSize>("md");
  readonly block = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    [
      "control",
      `control-${this.variant()}`,
      this.size() === "sm" ? "control-sm" : null,
      this.block() ? "control-block" : null,
    ]
      .filter((value): value is string => value !== null)
      .join(" "),
  );
}
```

Import `booleanAttribute` from `@angular/core`. Note `[class]` on the host
replaces the class list, which is fine because no Phase 1 caller adds its own
class to a button; if a later phase needs one, switch to individual
`[class.control-primary]` bindings rather than concatenating in the template.

### 4.8 The failure decoder (FE-14, FE-15, P-10)

`core/http/api-failure.ts`:

```ts
export type ApiFailure =
  | { readonly kind: "api"; readonly status: number; readonly code?: string }
  | { readonly kind: "network" }
  | { readonly kind: "timeout" }
  | { readonly kind: "invalid-response" }
  | { readonly kind: "unexpected" };
```

`core/http/decode-api-failure.ts`:

```ts
import { HttpErrorResponse } from "@angular/common/http";
import { apiErrorResponseSchema } from "@idkdo/shared";

import type { ApiFailure } from "./api-failure";

/**
 * The single transport-failure decoder (FE-14). It classifies shape only: no
 * user copy, no navigation, no retry. The feature action that knows the
 * attempted operation chooses the French message (FE-15, DS-24).
 */
export function decodeApiFailure(error: unknown): ApiFailure {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return { kind: "network" };
    }

    if (error.status === 408 || error.status === 504) {
      return { kind: "timeout" };
    }

    const parsed = apiErrorResponseSchema.safeParse(error.error);

    return parsed.success
      ? { kind: "api", status: error.status, code: parsed.data.error.code }
      : { kind: "api", status: error.status };
  }

  if (isSchemaFailure(error)) {
    return { kind: "invalid-response" };
  }

  if (error instanceof Error && error.name === "TimeoutError") {
    return { kind: "timeout" };
  }

  return { kind: "unexpected" };
}

/**
 * Structural rather than `instanceof ZodError`: `web` deliberately has no direct
 * `zod` dependency, and it consumes schemas through `@idkdo/shared`.
 */
function isSchemaFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { readonly issues: unknown }).issues)
  );
}
```

With `exactOptionalPropertyTypes`, never write `code: undefined` — return the
two-branch object above.

`decode-api-failure.spec.ts` must cover, one `it` each:

1. `HttpErrorResponse({ status: 0 })` → `{ kind: "network" }`.
2. `HttpErrorResponse({ status: 409, error: { error: { code: "X", message: "m" } } })`
   → `{ kind: "api", status: 409, code: "X" }`.
3. `HttpErrorResponse({ status: 500, error: "<html>" })` →
   `{ kind: "api", status: 500 }` with **no** `code` key
   (`expect(Object.hasOwn(result, "code")).toBe(false)`).
4. `HttpErrorResponse({ status: 504 })` → `{ kind: "timeout" }`.
5. A real Zod error: `try { createEventResponseSchema.parse({}); } catch (error)`
   → `{ kind: "invalid-response" }`. This is the branch most likely to rot
   across a Zod upgrade, so it is tested against a real shared schema rather
   than a hand-built object.
6. `new Error("boom")` → `{ kind: "unexpected" }`.

### 4.9 The creation action

`features/events/data-access/create-event-action.ts`. One screen owns it, so it
is declared `@Service({ autoProvided: false })` and listed in the page's
`providers` — that combination is checked against the pinned
`@angular/core@22.0.8` typings, where `autoProvided` is `@publicApi` and defaults
to `true`. A bare `@Service()` would also work through the page's `providers`
array, but would leave the action injectable from anywhere, which is not what
FE-11's "local injected action for a one-screen flow" means. The decorator itself
is the repository's existing convention — see
`core/identity/selected-participant-context.ts`.

```ts
import { HttpClient } from "@angular/common/http";
import { Service, inject, signal } from "@angular/core";
import { createEventResponseSchema, type CreateEventResponse } from "@idkdo/shared";
import { firstValueFrom } from "rxjs";

import { decodeApiFailure } from "../../../core/http/decode-api-failure";

export type CreateEventOutcome =
  | { readonly kind: "created"; readonly event: CreateEventResponse }
  | { readonly kind: "failed"; readonly message: string };

@Service({ autoProvided: false })
export class CreateEventAction {
  private readonly http = inject(HttpClient);
  private readonly pending = signal(false);

  readonly isPending = this.pending.asReadonly();

  async run(name: string): Promise<CreateEventOutcome> {
    if (this.pending()) {
      return { kind: "failed", message: duplicateSubmissionMessage };
    }

    this.pending.set(true);

    try {
      const response = await firstValueFrom(
        this.http.post<unknown>("/api/events", { name }),
      );

      return { kind: "created", event: createEventResponseSchema.parse(response) };
    } catch (error: unknown) {
      const failure = decodeApiFailure(error);
      // FE-15: internal detail is logged, never rendered.
      console.error("Event creation failed", failure, error);

      return { kind: "failed", message: messageFor(failure) };
    } finally {
      this.pending.set(false);
    }
  }
}
```

`messageFor` maps only understood outcomes and falls back to one generic retry
message (DS-24, FE-15):

| Failure | French copy |
| --- | --- |
| `{ kind: "network" }` | `Vous semblez hors ligne. Vérifiez votre connexion, puis réessayez.` |
| `{ kind: "api", status: 400 }` and `422` | `Ce nom d’événement n’est pas valide. Modifiez-le, puis réessayez.` |
| everything else | `L’événement n’a pas pu être créé. Réessayez.` |

`duplicateSubmissionMessage` is the generic message; the guard exists as a
belt-and-braces second line behind the form's own `submitting()` state
(FE-11 forbids relying on click timing).

`create-event-action.spec.ts` uses `provideHttpClient` with
`provideHttpClientTesting` and `HttpTestingController`, and covers: success
parses and returns the event; a malformed 201 body yields `failed` with the
generic message; status 0 yields the offline message; status 400 yields the
invalid-name message; `isPending` is true during flight and false after both
outcomes; a second concurrent `run` does not issue a second request.

### 4.10 The creation page

Files: `create-event-page.ts`, `.html`, `.css`, `.spec.ts`. States required by
DS-16: idle, invalid, submitting, API error, offline error, created, copy
success, copy failure, long-name.

```ts
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import {
  FormField,
  form,
  required,
  submit,
  validateStandardSchema,
} from "@angular/forms/signals";
import { RouterLink } from "@angular/router";
import { createEventRequestBodySchema, type CreateEventResponse } from "@idkdo/shared";

import { Button } from "../../../../shared/ui/button/button";
import { Field } from "../../../../shared/ui/field/field";
import { Icon } from "../../../../shared/ui/icon/icon";
import { InlineMessage } from "../../../../shared/ui/inline-message/inline-message";
import { CreateEventAction } from "../../data-access/create-event-action";

type CopyState = "idle" | "copied" | "failed";

@Component({
  selector: "app-create-event-page",
  imports: [Button, Field, FormField, Icon, InlineMessage, RouterLink],
  providers: [CreateEventAction],
  templateUrl: "./create-event-page.html",
  styleUrl: "./create-event-page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEventPage {
  private readonly createEvent = inject(CreateEventAction);

  protected readonly model = signal({ name: "" });
  protected readonly eventForm = form(this.model, (event) => {
    required(event.name, { message: "Saisissez un nom d’événement." });
    validateStandardSchema(event, createEventRequestBodySchema);
  });
  protected readonly submitError = signal<string | null>(null);
  protected readonly createdEvent = signal<CreateEventResponse | null>(null);
  protected readonly createdName = signal("");
  protected readonly copyState = signal<CopyState>("idle");
  protected readonly shareUrl = computed(() => {
    const created = this.createdEvent();

    return created === null
      ? ""
      : new URL(`/events/${created.id}`, window.location.origin).href;
  });
  protected readonly fieldError = computed(() =>
    this.eventForm.name().touched() && this.eventForm.name().invalid()
      ? "Saisissez un nom d’événement."
      : null,
  );

  private readonly shareHeading =
    viewChild<ElementRef<HTMLHeadingElement>>("shareHeading");

  protected onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    this.submitError.set(null);
    void submit(this.eventForm, async (form) => {
      const name = form().value().name.trim();
      const outcome = await this.createEvent.run(name);

      if (outcome.kind === "failed") {
        this.submitError.set(outcome.message);
        return { kind: "server", message: outcome.message };
      }

      this.createdName.set(name);
      this.createdEvent.set(outcome.event);
      this.focusShareHeading();
      return undefined;
    });
  }

  protected async copyShareUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl());
      this.copyState.set("copied");
    } catch {
      this.copyState.set("failed");
    }
  }

  private focusShareHeading(): void {
    // DS-12 permits moving focus when navigation semantics require it: the
    // submit button that had focus is removed from the DOM, so focus would
    // otherwise fall to <body> and the new content would go unannounced.
    requestAnimationFrame(() => {
      this.shareHeading()?.nativeElement.focus();
    });
  }
}
```

Template, reproducing the Atelier `creation.html` hierarchy with semantic
markup (DS-1). Both states share the wordmark and tagline; exactly one `<h1>` is
present in each.

```html
<div class="solo">
  <div class="solo-inner">
    <p class="wordmark">
      <app-icon name="gift" size="lg" />
      <span>idk<em>do</em></span>
    </p>
    <p class="tagline">Des cadeaux bien coordonnés, des surprises intactes.</p>

    @if (createdEvent(); as created) {
      <section class="surface-card share-block" aria-labelledby="share-title">
        <h1 id="share-title" #shareHeading tabindex="-1">
          <app-icon name="check-circle" />
          « {{ createdName() }} » est prêt
        </h1>
        <p class="share-lede">
          Envoyez ce lien dans la conversation de famille — chacun choisira son
          prénom en arrivant.
        </p>

        <p class="share-link">
          <app-icon name="link" size="sm" />
          <a class="share-url" [href]="shareUrl()">{{ shareUrl() }}</a>
          <button
            appButton
            variant="accent"
            size="sm"
            type="button"
            (click)="copyShareUrl()"
          >
            <app-icon name="copy" size="sm" />
            Copier le lien
          </button>
        </p>

        @if (copyState() === "copied") {
          <app-inline-message tone="success">Lien copié.</app-inline-message>
        }
        @if (copyState() === "failed") {
          <app-inline-message tone="danger">
            Le lien n’a pas pu être copié. Sélectionnez-le pour le copier
            vous-même.
          </app-inline-message>
        }

        <a appButton block [routerLink]="['/events', created.id]">
          Entrer dans l’événement
          <app-icon name="arrow-right" size="sm" />
        </a>
      </section>
    } @else {
      <section class="surface-card" aria-labelledby="create-event-title">
        <h1 id="create-event-title">Créez votre événement</h1>
        <p class="create-hint">Un nom suffit. Pas de compte, pas de mot de passe.</p>

        <form (submit)="onSubmit($event)" novalidate>
          <app-field
            controlId="event-name"
            label="Nom de l’événement"
            [error]="fieldError()"
          >
            <input
              id="event-name"
              class="text-control"
              type="text"
              autocomplete="off"
              [formField]="eventForm.name"
              [attr.aria-describedby]="fieldError() ? 'event-name-error' : null"
              [attr.aria-invalid]="fieldError() ? 'true' : null"
            />
          </app-field>

          <button appButton block type="submit" [disabled]="eventForm().submitting()">
            <app-icon name="gift" size="sm" />
            {{ eventForm().submitting() ? "Création…" : "Créer l’événement" }}
          </button>

          @if (submitError()) {
            <app-inline-message tone="danger">{{ submitError() }}</app-inline-message>
          }
        </form>
      </section>
    }

    <p class="trust">
      Vos proches n’auront besoin que du lien. Rien à installer, rien à retenir.
    </p>
  </div>
</div>
```

Page CSS, consuming role tokens only:

```css
.solo {
  align-items: center;
  display: flex;
  flex-direction: column;
  padding: var(--space-8) var(--space-5) var(--space-10);
}

.solo-inner {
  max-width: 28.75rem;
  width: 100%;
}

.wordmark {
  align-items: center;
  display: flex;
  font-family: var(--font-display);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  gap: var(--space-2);
}

.wordmark app-icon,
.wordmark em {
  color: var(--color-action);
  font-style: normal;
}

.tagline {
  color: var(--color-text-muted);
  margin: var(--space-1) 0 var(--space-6);
}

h1 {
  align-items: center;
  display: flex;
  font-size: var(--font-size-xl);
  gap: var(--space-2);
}

.create-hint,
.share-lede {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin: var(--space-1) 0 var(--space-4);
}

form {
  display: grid;
  gap: var(--space-4);
}

.share-block {
  background: var(--surface-accent);
  display: grid;
  gap: var(--space-3);
}

.share-link {
  align-items: center;
  background: var(--surface-card);
  border: 1px dashed var(--border-interactive);
  border-radius: var(--radius-md);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
}

.share-url {
  flex: 1 1 12rem;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  min-width: 0;
  overflow-wrap: anywhere;
}

.trust {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  margin-top: var(--space-5);
  text-align: center;
}

@media (min-width: 900px) {
  .solo {
    padding-top: var(--space-10);
  }

  .solo-inner {
    max-width: var(--content-width-solo);
  }
}
```

Two deliberate departures from the mockup, both locked: the share card is a flat
`--surface-accent` rather than the mockup's 135° gradient (one value to contrast-
check instead of two, and the gradient's two stops are near-identical anyway),
and the `.share-url` wraps instead of ellipsing, because a truncated share link
that a user cannot read is worse than two lines. The mockup's "après création"
divider is a mockup device for showing both states at once — do not build it.

`app.routes.ts` gains the title required by FE-18:

```ts
{ path: "", component: CreateEventPage, title: "Créer un événement · idkdo" },
```

### 4.11 Chrome removal (P-7)

- `app.html` → `<router-outlet />` and nothing else.
- `app.ts` → drop `styleUrl`; delete `app.css`.
- `app.spec.ts` → the brand is no longer in the frame. Replace the
  `toContain("idkdo")` expectation with an assertion that the outlet is present,
  and rename the test to say what it now covers.

### 4.12 Deletions in this PR (FE-24)

| Artifact | Why it can go now |
| --- | --- |
| `EventRepository.createEvent` and its `normalizeError` use for that path | replaced by `CreateEventAction` with test coverage |
| the `createEvent` cases in `event-repository.spec.ts` | behavior now covered by `create-event-action.spec.ts` |
| `web/src/app/app.css` | replaced by the Atelier solo layout |
| the old `create-event-page.css` rules | rewritten |
| the legacy `:root` block, font stack, and reset rules in `styles.css` | moved to `reset.css` and `legacy-tokens.css` |

Keep `EventRepository.getEvent` and `createParticipant`, `EventRepositoryError`,
and `event-entry-route.ts` untouched: Phase 2 replaces them, and RW-6's 404
retry still depends on the error class. Do not start that migration here.

### 4.13 The two executable checks

**`web/scripts/verify-design-tokens.mjs`** (P-12). Scan `web/src/**/*.css`.
Fail when a file outside the allowlist contains a raw color literal
(`#rgb`/`#rrggbb`/`#rrggbbaa`, `rgb(`, `rgba(`, `hsl(`, `hsla(`) or the string
`--palette-`. Allowlist exactly two categories, and fail if any allowlisted path
no longer exists so the list cannot rot:

```js
const foundations = ["src/app/shared/ui/styles/tokens.css"];
// Deleted by the phase that rebuilds each screen. Do not add to this list.
const legacyStylesheets = [
  "src/app/shared/ui/styles/legacy-tokens.css",
  "src/app/features/events/pages/event-entry-page/event-entry-page.css",
  "src/app/features/events/pages/event-entry-page/event-participant-entry.css",
  "src/app/features/events/pages/event-home-page/event-home-page.css",
  "src/app/features/events/pages/event-unavailable-page/event-unavailable-page.css",
  "src/app/features/wishes/components/event-wishes-panel/event-wishes-panel.css",
  "src/app/features/wishes/components/reservation-coordination/reservation-coordination.css",
  "src/app/features/wishes/components/wishlist-item/wishlist-item.css",
  "src/app/features/wishes/components/wishlist-panel/wishlist-panel.css",
];
```

Note that `tokens.css` itself uses `rgba()` in `--shadow-card`, and
`controls.css`, `reset.css`, `utilities.css`, and every new component stylesheet
must be literal-free — that is the whole point. Wire it into the web `test`
script:

```json
"test": "ng test --watch=false && node scripts/verify-design-tokens.mjs && pnpm run verify:pwa"
```

**`web/scripts/verify-pwa-cache-policy.mjs`** (RW-8, RW-14 row 2). Add three
assertions after the existing ones:

1. `ngsw-config.json`'s asset groups include `/fonts/**`.
2. The built `ngsw.json` `assetGroups` contain at least one URL matching
   `^/fonts/.+\.woff2$`, and the count equals the number of `.woff2` files in
   `dist/web/browser/fonts` — a subset match would let a missing family pass.
3. No built CSS references an external font host: read every `*.css` in
   `dist/web/browser` and assert none contains `fonts.googleapis.com` or
   `fonts.gstatic.com`. This is the Phase 1 gate's "no external font request"
   condition, checked statically rather than by watching the network.

### 4.14 Unit and component tests

New specs, with the cases that matter. Query by role, label, or text — not by
CSS selector (FE-21) — except where an existing spec's style already does
otherwise.

- **`icon-shapes.spec.ts`**: every `IconName` key has at least one shape; no
  geometry is entirely empty; the key list is sorted (a cheap guard against
  duplicate near-names creeping in).
- **`icon.spec.ts`**: default renders `aria-hidden="true"` and no `role`; with a
  `label`, renders `role="img"` and that `aria-label` and no `aria-hidden`; the
  `size` input changes the class; `copy` renders a `rect` and a `path`;
  `circle-alert` renders a `circle`.
- **`button.spec.ts`**: variant and size inputs produce the documented classes;
  `block` accepts the bare attribute form; the directive applies to both
  `button` and `a`.
- **`field.spec.ts`**: label's `for` matches `controlId`; hint and error render
  with the documented ids; error absent when `error` is null; projected control
  is rendered.
- **`inline-message.spec.ts`**: `danger` → `role="alert"`; `success` →
  `role="status"` and the check icon; content is projected.
- **`decode-api-failure.spec.ts`**: the six cases in 4.8.
- **`create-event-action.spec.ts`**: the six cases in 4.9.
- **`create-event-page.spec.ts`** — rewrite the existing file, keeping its four
  behaviors and adding the new states:
  1. blank or whitespace name shows "Saisissez un nom d’événement.", sets
     `aria-invalid` and `aria-describedby`, and does not call the API (keep the
     existing assertion that no raw Zod message such as "Too small" leaks).
  2. a valid submit calls the action once with the trimmed name and renders the
     share block containing the event name.
  3. duplicate submit while pending issues one request and disables the button.
  4. a failure renders the message, re-enables the button, and preserves the
     input value.
  5. offline failure renders the offline copy, not the generic copy.
  6. the share URL is `${origin}/events/${id}` and appears as a link whose text
     is that URL.
  7. copy success renders "Lien copié."; a rejected `writeText` renders the
     failure copy. Stub the clipboard with
     `Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })`
     and restore it afterwards.
  8. after creation, focus is on the share heading. `requestAnimationFrame` runs
     in jsdom; await `fixture.whenStable()` and a macrotask before asserting
     `document.activeElement`.
  9. a 200-character event name renders without overflowing — assert the
     wrapping class contract rather than measuring pixels.
- **`app.routes.spec.ts`**: the `""` route carries the title. Keep the existing
  ordering assertion untouched.

Delete the `expectTypeOf` block at the bottom of the old
`create-event-page.spec.ts`; it asserts the shape of a repository method that no
longer exists.

### 4.15 End-to-end updates

Only one behavioral assumption changes: creation no longer navigates (P-8).

- **`e2e/tests/support/family.ts`** — **no change needed.**
  `createEventThroughUi` does `goto("/")`, fills "Nom de l’événement", clicks
  "Créer l’événement", waits for a heading matching the event name, then reads
  the `href` of a link whose accessible name matches `/\/events\//`. On the new
  page the `<h1>` reads `« Noël 2026 » est prêt` (Playwright's default
  non-exact name match is a case-insensitive substring, so it matches), and the
  share anchor's text is the absolute event URL. Verify this by running the
  suite; if the heading match proves brittle, change the helper, not the copy.
- **`e2e/tests/core-workflow.spec.ts:23`** — after `createEventThroughUi`, the
  page now sits on `/`, so the "Ajouter votre nom" expectation must follow a
  navigation:

  ```ts
  await page.getByRole("link", { name: "Entrer dans l’événement" }).click();
  await expect(page.getByRole("heading", { name: "Ajouter votre nom" })).toBeVisible();
  ```

  This also gives the flow a real regression test for the new continuation link.
- `anti-spoil`, `reservation-lifecycle`, and `pwa-smoke` use only the returned
  `shareUrl` and need no change. Confirm by running them.

Do not add an axe scan (Phase 7) and do not add screenshot baselines (FE-23).

### 4.16 PR 2 gate

Measurable:

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`,
      `pnpm verify` green.
- [ ] `dist/web/browser/fonts/` contains four `.woff2` files; the generated
      `ngsw.json` lists all four; `verify-pwa-cache-policy.mjs` asserts it
      (RW-14 row 2 closed).
- [ ] `verify-design-tokens.mjs` passes and fails when you temporarily put a hex
      literal in a component stylesheet — prove it the way task 3.2 proves the
      anti-spoil control, and record the output.
- [ ] No built CSS references `fonts.googleapis.com` or `fonts.gstatic.com`.
- [ ] Raw initial bundle within 5 kB of the PR 1 baseline (P-11). Report the
      number.
- [ ] Every new stylesheet outside `tokens.css` is free of color literals and
      `--palette-` references.

Human review, at 320, 390, 768, and 1280 CSS pixels (DS-7, FE-25), with
`pnpm dev`:

- [ ] Idle, invalid, submitting, API-error, offline-error (throttle to offline
      in devtools), created, copy-success, and copy-failure states all render
      correctly, with no horizontal page scroll at any width.
- [ ] A 200-character event name and a 60-character name both wrap cleanly in
      the share block.
- [ ] Keyboard-only: tab order is wordmark-free, the field is reachable and
      labelled, submit works on Enter, focus lands on the share heading after
      creation, the copy button and continuation link are reachable, and the
      focus ring is visible on every one of them including the primary button.
- [ ] Text zoom to 200% keeps everything legible and reachable.
- [ ] `prefers-reduced-motion: reduce` removes transitions.
- [ ] Fonts render as Fraunces and Nunito Sans with the network tab showing
      requests only to `/fonts/`.
- [ ] Screenshots of both states at 390 and 1280 attached to the PR.

Then fill every section of the PR template, name the model used, and state
explicitly which checks were run and which were not.

---

## 5. Deletion Ledger For These Two Pull Requests

FE-24 deletes replaced code in the change that replaces it. Everything below is
either removed in PR 2 or explicitly deferred with its owner named, so Phase 7
has nothing to sweep.

| Artifact | Removed in | Blocking reason if deferred |
| --- | --- | --- |
| `app.css`, global header markup | PR 2 | — |
| `EventRepository.createEvent` | PR 2 | — |
| legacy `:root` / reset rules in `styles.css` | PR 2 | — |
| `EventRepository.getEvent` / `createParticipant` | Phase 2 | Event entry still calls them |
| `EventRepositoryError` | Phase 2 | carries RW-6's 404 retry until restated against `ApiFailure` |
| `WishRepository`, `ReservationRepository`, `WishRepositoryError` | Phases 4–6 | own the Wish and coordination reads |
| `legacy-tokens.css` | Phase 6 or 7, with its last consumer | eight legacy stylesheets consume it |
| eight allowlist entries in `verify-design-tokens.mjs` | one per rebuilding phase | the screen still exists |
| `.purchase-coordination` class name | Phase 4 | rename is Phase 4's; PR 1 only makes the rename fail loudly |

## 6. Out Of Scope — Do Not Touch

From RW-3, RW-13's "do not do yet", and the plan's Phase 1 boundary:

- No component explorer, state library, utility CSS framework, or new workspace
  package.
- No REST, server, or `@idkdo/shared` changes. The `wishCount` projection is
  Phase 2 (RW-1); this PR pair changes no contract.
- No feature flag, `/v2` route, or dual implementation (RW-3).
- No rebuild of Event entry, Event home, the Wish panels, or the unavailable
  page. They will look inconsistent after PR 2. That is expected (P-7).
- No rename or restyle of `.purchase-coordination`.
- No `@axe-core/playwright`, no screenshot baselines (FE-23).
- No lazy-route conversion (P-11), no manifest or `theme-color` change (P-15).
- No new npm dependency beyond the two Fontsource packages.
- No `any`, no `@ts-expect-error`, no ESLint suppression. The repository lints
  with `--max-warnings=0` and bans `any` outright.

## 7. Risk Register

| Risk | How it shows up | Containment |
| --- | --- | --- |
| Fonts silently missing from the offline shell | Phase 1 gate passes, offline shell falls back | The `ngsw.json` count assertion in 4.13, proven against the reproduction in 2.4 |
| Anti-spoil control written but vacuous | Rename in Phase 4 goes green anyway | Task 3.2 requires observing four failures and pasting the output |
| Contrast regression via a "small" palette tweak | Fails DS-15 at review, after the code is written | All literals live in `tokens.css`; `verify-design-tokens.mjs` keeps them there; ratios are recorded in 2.3 |
| e2e helper churn cascading into four specs | Phase 1 unexpectedly rewrites the suite | P-8 keeps the share URL an anchor so the helper's locators still match; only one assertion changes |
| Zod upgrade breaks the `invalid-response` branch | Real schema failures decode as `unexpected`, users see the wrong copy | Case 5 of `decode-api-failure.spec.ts` uses a real shared schema |
| The action leaks out of its screen | Two screens share submission state | `autoProvided: false` plus the page's `providers` entry; the spec asserts a fresh instance per component |
| Focus stolen on ordinary renders | DS-12 violation caught late | Focus moves in exactly one place, `focusShareHeading`, and its trigger is tested |
| Budget warning blamed on Phase 1 | Time lost chasing a pre-existing 1.10 kB overage | P-11 records the baseline number; report the delta, not the total |

## 8. Definition Of Done For This Plan

Both pull requests merged, and:

1. RW-13's five gate items are all annotated Done, with the rename experiment's
   output recorded.
2. RW-14 is a ledger, and its Phase 0 and Phase 1 rows are green.
3. The creation flow is implemented in the Atelier language, with every state in
   4.16 reviewed at the four DS-7 widths.
4. The foundations layer exists, is the only place with color literals, and is
   enforced by a script.
5. Self-hosted fonts render offline, verified in the generated `ngsw.json`.
6. `CreateEventAction` and `decodeApiFailure` exist; `EventRepository.createEvent`
   does not; nothing else from the repository layer was touched.
7. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, and
   `pnpm verify` pass, or any skipped check is reported with its reason.
