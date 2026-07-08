# Frontend Architecture

Status: Accepted initial guidance
Applies To: `web/`
Verification: Browser and end-to-end tests should cover the core gift coordination flow and anti-spoil behavior. Service-worker checks should verify REST API responses are not cached.

## Decision

The Web UI is an Angular Progressive Web App using modern Angular patterns.

Frontend code is organized feature-first. The frontend does not own domain invariants or Purchase Coordination visibility rules. It renders server-provided read models whose visibility has already been enforced by API queries.

## Details

Feature folders own their routes, page components, feature components, state, and repositories when those pieces are specific to the feature.

Angular standalone components are the default. Feature routes are lazy-loaded where they represent distinct user-facing surfaces.

Components do not call `HttpClient` directly. They use frontend repositories. Frontend repositories are client-side data access adapters, not DDD repositories, and do not enforce domain invariants.

Frontend repositories are placed by reuse scope:

- `core/` for app-wide concepts;
- `features/shared/` for repositories shared across multiple features;
- inside a feature when dedicated to that feature.

The app starts without a third-party state management library. State uses native Angular primitives: services, signals, computed values, effects, route params, and forms. State stays as close as possible to the feature that owns it and is promoted upward only when multiple features need it.

After successful mutation requests, frontend flows should refresh from the server or patch local state only when the API response already contains the authoritative result needed for that screen.

The service worker caches static application assets only. It must not cache REST API responses containing Event, Participant, Wish, Reservation, Contributor, or Purchase Coordination data.
