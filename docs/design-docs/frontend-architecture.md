# Frontend Architecture

Status: Accepted
Applies To: `web/`
Verification: Unit, component, and router tests cover view models, accessible rendering, and route behavior. Browser and end-to-end tests cover the core gift coordination flow and anti-spoil behavior, with a positive control on every visibility assertion. Service-worker checks verify that REST API responses are not cached and that self-hosted fonts are.

## Decision

The Web UI is an Angular Progressive Web App using modern Angular patterns,
organized feature-first.

The frontend does not own domain invariants or Purchase Coordination visibility
rules. It renders server-provided read models whose visibility has already been
enforced by API queries.

Frontend data access uses Angular's own primitives directly: `httpResource` for
GET read models with runtime validation, and explicit `HttpClient` actions on
route-scoped feature state for mutations. There is no repository layer.

That is a deliberate reversal of earlier guidance, recorded here so it is not
undone by habit. Entity-style repositories around a REST API whose endpoints
already express product use cases add a class per entity, a custom `Error`
subclass per feature, and a duplicated error-normalizing function per
repository, without adding a decision point. The boundary that matters — a
testable seam between pages and HTTP — is feature state; the wrapper around it
is not.

Rules are numbered `FE-n` so implementation and review can cite them.

## Details

### Layering

**FE-1 — Four layers, one direction.** Routes and pages depend on feature state;
feature state depends on data access; everything may depend on shared UI. Shared
UI depends on nothing but tokens.

**FE-2 — Shared UI is domain-neutral; feature state is the only layer that knows
the wire.** URLs, Zod schemas, and API status codes live in feature
`data-access/` and `state/` files. Pages consume signals and named actions. See
[DESIGN.md](../../DESIGN.md) DS-17 and DS-18 for the component-boundary side of
this rule.

**FE-3 — A slice lives under one feature owner.** A page and its store do not
straddle two feature folders. Cross-feature imports between features are a
design smell, not a shortcut.

Source layout:

```txt
web/src/app/
  core/
    http/                 # identity interceptor, failure decoder
    identity/             # selected Participant context and guard
    router/               # resolver/provider helpers
  shared/
    ui/                   # domain-neutral primitives
    styles/               # tokens, typography, reset, small utilities
  features/
    <feature>/
      data-access/        # schemas, resource and action factories
      state/              # route-scoped stores
      components/         # feature UI
      layout/             # shells and navigation, where a feature owns one
      pages/              # routed destinations
```

### Identity

**FE-4 — Every viewer-scoped read takes identity as an explicit reactive
input.** `participantIdInterceptor` attaches `X-Participant-Id` outside any
resource's reactive computation. A URL function that omits the identity signal
does not re-run when the viewer switches, so the resource keeps serving the
previous viewer's visibility filtering — a leak adjacent to the one rule the
frontend must never break. Every `httpResource` reading a viewer-scoped endpoint
reads the selected Participant signal inside its URL function and returns
`undefined` until identity is known: the first forces the refetch on switch, the
second prevents the request firing before the guard populates the context, which
would fail uuid-required header validation with a 400.

```ts
readonly eventWishes = httpResource(
  () => {
    const participantId = this.selectedParticipant.selection();
    if (!participantId) return undefined;
    return `/api/events/${this.eventId()}/wishes`;
  },
  { parse: (value) => getEventWishesResponseSchema.parse(value) },
);
```

Every viewer-scoped resource carries a test that switching identity refetches.

**FE-5 — Guards are navigation convenience, never security.** The
selected-Participant guard lives in `core/identity/` and is applied once on the
shared parent route so children inherit it; children are not re-guarded
individually. The server remains authoritative on membership and permissions.

### State

**FE-6 — Signals own local and derived state; route-scoped services own shared
feature state.** No third-party state management library. `@signality/core`
(`createInjectable`) is a dependency-injection helper rather than a global store,
and this rule does not forbid it.

**FE-7 — State shared by sibling routes is provided at their common parent.**
Providing it per child destroys and recreates the store on every navigation
between siblings, refetching its resources and discarding mutation-patched
state. Where this matters, a test asserts that navigating between siblings does
not refetch.

**FE-8 — One source per derived value.** Two surfaces showing the same number
read the same resource. A value derived from a non-reactive snapshot — a
resolver result, for instance — will disagree with a live resource after any
mutation. If a displayed value has to be updated in a second place after a
write, this rule has been broken somewhere.

**FE-9 — Compute view models outside templates.** Grouping, counts, action
labels, and derived state are `computed` signals, not template expressions.
Never infer hidden state from ownership, and never use CSS relational selectors
to express state or visibility — bind an explicit semantic class from the view
model.

**FE-10 — Avoid effects for state propagation.** Derive with `computed`. Effects
are for genuine side effects at the edge of the app.

### Data Access

**FE-11 — `httpResource` for GETs, `HttpClient` for mutations.** GET read models
are resources with a `parse` option running the shared Zod schema, exposing
`hasValue`, `isLoading`, `error`, and `reload` to the page. Mutations are
explicit async actions on the feature store with their own pending state: call
`HttpClient`, parse the successful response, guard duplicate submission through
form and mutation state rather than click timing, patch local state only from
the authoritative response, and reload on concurrency conflicts.

**FE-12 — Add a shared API client only on proven reuse.** When two or more
features genuinely need the same transport operation, extract it. Do not create
one class per entity as a convention.

**FE-13 — Signal Forms are the form standard.** Confirm that the primitives a
change relies on are stable in the pinned Angular version rather than assuming
it; do not build on `@experimental` symbols.

### Failure Handling

**FE-14 — One pure decoder, one discriminated value.** `core/http` converts
`HttpErrorResponse`, network status 0, timeout, Zod failure, and unknown
exceptions into:

```ts
type ApiFailure =
  | { kind: "api"; status: number; code?: string }
  | { kind: "network" }
  | { kind: "timeout" }
  | { kind: "invalid-response" }
  | { kind: "unexpected" };
```

No feature-specific `Error` subclass exists merely to carry a status or code,
and no feature re-implements the decoder.

**FE-15 — User-facing copy is chosen by the action that knows the operation.**
The feature action switches on the API status or business code it understands
and selects French copy locally, per [DESIGN.md](../../DESIGN.md) DS-24. Unknown
detail is logged for diagnostics, never rendered.

**FE-16 — Reads that can race a just-completed write retry before giving up.**
Where a create is immediately followed by a read of the same entity, a 404 may
mean projection lag rather than absence. Retry with bounded backoff before
treating it as terminal, and cover the retry with a test — these failures are
intermittent and will not surface in manual checks.

**FE-17 — Interceptors stay narrow.** The functional Participant-id interceptor
is genuinely cross-cutting and is configured explicitly with `withInterceptors`.
Interceptors do not translate domain errors, choose UI messages, navigate, retry
with side effects, or cache API bodies. Add an observability or timeout
interceptor only if the entire API adopts the same policy.

### Routes

**FE-18 — Routes represent destinations.** Anything a user should be able to
link to, reload, or reach by back button is a route with a useful document
title. Transient confirmation stays local component state. Feature routes are
lazy-loaded where they represent distinct user-facing surfaces. Unknown ids
within a known surface resolve to a not-found state; unknown top-level routes
redirect to the landing route. The V1 route map is specified in
[SPEC-implementation.md](../SPEC-implementation.md).

**FE-19 — Resolvers stay lightweight.** They supply essential route context
only. Read models belong in resources.

### PWA

**FE-20 — The service worker caches the application shell, never its data.** It
must not cache REST API responses containing Event, Participant, Wish,
Reservation, Contributor, or Purchase Coordination data. It must cache
everything the offline shell needs to render correctly, including self-hosted
fonts. Asset coverage is verified against the generated `ngsw.json`, not
inferred from `ngsw-config.json` — build output paths and config patterns drift
apart silently.

### Testing

**FE-21 — Test by responsibility.** Pure tests cover computed view models,
grouping, action labels, and content segmentation. Component tests cover
accessible rendering and interaction, queried by role, label, or text rather
than CSS implementation selectors. Router tests use `RouterTestingHarness` for
deep links, redirects, unknown ids, and titles rather than shallow route-config
assertions. End-to-end tests cover user journeys and anti-spoil boundaries.

**FE-22 — Every negative visibility assertion is paired with a positive
control.** An assertion that a selector has count 0 passes vacuously the moment
that selector is renamed, and reports success while the leak it guarded goes
unchecked. Each "absent for this viewer" assertion is accompanied by a "present
for that viewer" assertion on the same locator, so a rename fails loudly.
Network-response body assertions stay alongside the DOM ones: the payload is
where a leak appears first.

**FE-23 — No screenshot baseline suite.** Automated visual regression compares
local macOS rendering against CI Linux with self-hosted fonts, and needs
regenerating whenever the design changes deliberately, so it asserts little at
high cost. Visual fidelity is confirmed by human review per
[DESIGN.md](../../DESIGN.md). `@axe-core/playwright` is the automated
accessibility gate, and its scan set is a gate rather than a report.

**FE-24 — Delete replaced code in the change that replaces it**, once tests
cover the behavior rather than the old API. Carrying a dead artifact forward
makes every subsequent change harder to read for no benefit.

### Browser Validation

**FE-25 — A screen is reviewed in a real browser before it is called done**, at
the [DESIGN.md](../../DESIGN.md) DS-7 reference widths, exercising loading,
empty, error, conflict, and offline states rather than the happy path alone. Run
`pnpm dev`, walk the journey, and check for horizontal scroll, focus order, and
visible busy states. When validating a visibility rule, read the network
response body as well as the rendered DOM.

Verification commands and when to run them are owned by AGENTS.md §8.
