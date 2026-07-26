# idkdo Design

## Role

This document is the product and design-system doctrine for the idkdo Web UI.

It governs what a user sees and how the interface expresses itself: visual
language, layout, interaction, accessibility, component vocabulary, and copy.

`ARCHITECTURE.md` and `docs/design-docs/frontend-architecture.md` govern how the
code is arranged. Where the two touch, this document decides what a thing must
look like and how it must behave; the frontend architecture doc decides where it
lives and what its inputs are.

The visual direction is **Atelier**, retained from
`docs/design-explorations/2026-07-20-ui-propositions/06-atelier/`. That
exploration is a visual source, not production markup.

Rules are numbered `DS-n` so implementation and review can cite them.

## Visual Language

**DS-1 — Atelier is a source, not a stylesheet to copy.** Reproduce its
hierarchy, density, and behavior with semantic Angular templates. Never paste
its markup, inline styles, duplicated SVG sprites, or `:has()` selector rules
into feature components.

**DS-2 — Colors carry fixed meanings.** The palette is warm paper and brown ink,
with three accents that are not interchangeable:

| Role | Meaning | Where it appears |
| --- | --- | --- |
| Canvas / surface | Cream paper, warm white cards | Page background, cards, rails |
| Ink | Primary text | Headings, body, active navigation |
| Terracotta | Action | Primary buttons, links, "I'll handle it" |
| Pine | Reserved / coordinated state | Reservation status, reserved relief |
| Gold | Navigation accent | Active nav item, current-participant chip |
| Danger | Destructive and failure | Delete, error messages |

A Wish being reserved is pine. A button being pressable is terracotta. Do not
use terracotta to mean "reserved" or pine to mean "primary action."

**DS-3 — Mockup hex values are candidates, not law.** Every token used for text
is verified at 4.5:1 (normal) or 3:1 (large text and UI boundaries) against the
surface it sits on before it enters the foundations layer. Several of Atelier's
own values fail that bar, so copying them is not an option — a warm palette on
cream paper runs close to the line, and the check is not a formality.

Where an accent fails as text, the deeper variant is the text token and the base
stays a fill: **terracotta is the fill and surface color, terracotta-deep is the
text-on-light color.** The same split applies to any accent that appears both
behind and as type.

**DS-4 — Tokens are semantic, never raw.** Source palette values stay private to
the foundations layer. Feature CSS consumes role aliases only: `--color-text`,
`--color-text-muted`, `--color-action`, `--color-reserved`, `--surface-canvas`,
`--surface-card`, `--surface-own-list`, `--focus-ring`. No raw hex, ad-hoc
shadow, or unapproved font size in a feature stylesheet. This is what makes a
later contrast adjustment a one-file change.

**DS-5 — Typography is Fraunces for display, Nunito Sans for body.** Both are
self-hosted as subset WOFF2 with `font-display: swap` and explicit fallbacks
(`Georgia, serif` and `system-ui, sans-serif`), preloaded only for critical
weights. No runtime stylesheet dependency on a font CDN — the PWA must render
its offline shell in the real typefaces, which means the font files are cached
by the service worker.

**DS-6 — Icons are a vendored Lucide subset behind one Icon component.** Only
the icons V1 actually uses, with the Lucide license retained in-repo. No inline
sprite repeated per page. Decorative icons are hidden from assistive
technology; meaningful ones carry an accessible name.

## Layout

**DS-7 — Mobile-first, verified at four widths.** 320, 390, 768, and 1280 CSS
pixels are the reference widths for every screen. No horizontal page scroll at
any of them. The Participant rail is the only intentionally scrollable strip;
nothing else may nest horizontal scrolling.

**DS-8 — The Event is a workbench, not a stack of tabs.** Desktop gets a sticky
sidebar with Event identity, all-lists, my-list, and Participant links. Mobile
gets a sticky topbar, a horizontally scrollable Participant rail, and
safe-area-aware bottom navigation. Both express the same destinations from the
same source data — one semantic component tree, CSS for the presentation
difference.

**DS-9 — Wishes are dense rows, not large cards.** This is Atelier's defining
choice. A list block groups one Participant's Wishes; rows stay scannable at
mobile width with long titles and multiline content.

## Interaction

**DS-10 — Native semantics first.** Real links, buttons, headings, lists,
labels, inputs, and textareas. Angular Aria is added only for a genuinely custom
interaction pattern that has no native equivalent, never to re-implement a
control the platform already ships.

**DS-11 — State is never signalled by color alone.** Active navigation, reserved
Wishes, and error states use text or shape in addition to color.

**DS-12 — Focus is visible and never stolen.** A single shared focus-ring token,
visible on every interactive element. Move focus programmatically only when
navigation semantics require it; ordinary route changes do not steal focus.
Cancelling a destructive confirmation restores focus to the trigger.

**DS-13 — Busy states do not shift layout.** Pending actions reserve their
space. Loading uses skeletons or reserved space rather than collapsing content.

**DS-14 — Respect reduced motion.** Motion is a token-governed accent. Under
`prefers-reduced-motion: reduce`, transitions are removed rather than shortened.

## Accessibility

**DS-15 — These are gates, not aspirations.** Contrast per DS-3, touch targets
at least 44×44 CSS pixels, legible at 200% text zoom, keyboard-operable end to
end, and accessible names on every icon-only control. An automated
`@axe-core/playwright` scan gates creation, entry, board, own list, participant
list, coordination, and unavailable states.

**DS-16 — Every screen specifies its non-happy states.** A screen is not
complete until loading, empty, error, conflict, and offline appearances are
defined alongside the happy path. Fixtures for long Event and Participant names,
accented initials, zero/one/many Contributors, many Participants, multiline
Wishes, and long URLs exist before a screen is called done.

## Component Vocabulary

**DS-17 — Shared UI is domain-neutral.** Primitives — icon, avatar, button/link
treatment, icon button, field container, inline message, card/surface, visually
hidden — know nothing about Events, Wishes, Reservations, or Participants. They
accept neutral values: text, initials, tone, size, disabled state.

**DS-18 — Feature UI owns product language.** Wish list block, Wish row,
Reservation summary, Contributor list, and Wish editor may know product types
and copy. They must not call the API directly or enforce server-owned
visibility.

**DS-19 — Promote a pattern only after two real usages.** The design system
grows through product slices. A component is added when a second surface needs
the same behavior or structure, not in anticipation. No component explorer,
utility CSS framework, or separately deployed showcase is a prerequisite for V1.

**DS-20 — Avatar colors are deterministic and contrast-tested.** Initials derive
from the Participant name; the color is a stable function of identity, drawn
from a palette where every entry passes contrast under white initials at the
rendered size.

## Copy And Language

**DS-21 — The UI language is French.** All product copy, all error messages, all
labels. This constrains component APIs that accept text; treat it as a
foundation decision alongside typography rather than a translation pass.

**DS-22 — Action labels describe viewer participation, not permission.** A free
Wish leads with "I'll handle it." A reserved Wish shows "Join" or "Manage"
depending on whether the viewer already contributes. Never "View" versus
"Manage" — that leaks a permission distinction into the interface.

**DS-23 — Own lists state the absence plainly.** The Wisher's own list says
coordination is hidden. It renders no coordination component, no placeholder,
and no empty shell that could later be filled by a leak.

**DS-24 — Failures are specific where understood, generic where not.** Known
business outcomes (duplicate Participant, reservation conflict) get precise
French copy. Everything else gets one generic retry message; internal detail is
logged, never rendered.

## Verification

Atelier fidelity is confirmed by human review against the retained mockups at
the DS-7 reference widths. There is no screenshot baseline suite — see
`docs/design-docs/frontend-architecture.md` for why automated visual regression
is out of scope.

Accessibility is verified by the axe scan set in DS-15 plus a keyboard-only
pass, a screen-reader smoke pass, contrast verification, 200% zoom, and reduced
motion.

## Related Documents

- `ARCHITECTURE.md` — technical map and package layering.
- `docs/design-docs/frontend-architecture.md` — frontend engineering rules.
- `docs/PRODUCT.md` — product principles.
- `docs/SPEC-implementation.md` — V1 behavior and acceptance criteria.
