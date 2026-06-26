# idkdo V1 Implementation Spec

Status: Implementation contract for first release (V1)
Date: 2026-05-13
Audience: Product, engineering, and AI agents
Source inputs: `GOAL.md`, `PRODUCT.md`, `SPEC.md`

## 1. Document Role

`SPEC.md` remains the long-horizon product specification.

This document is the concrete, build-ready V1 contract.

When there is a conflict, `SPEC-implementation.md` controls V1 behavior.

## 2. V1 Outcomes

idkdo V1 must provide a complete gift coordination loop:

1. A person creates an Event and gets a shareable link.
2. People enter the Event through the link.
3. Each person chooses or creates a Participant identity.
4. Participants manage their own Wishlists.
5. Participants browse other Participants' Wishes.
6. Participants coordinate Reservations for Wishes they do not own.
7. The Wisher never sees Purchase Coordination for their own Wishes.

Success means a family can use idkdo end-to-end for a real gift event without accounts, manual setup, or external coordination.

## 3. Explicit V1 Product Decisions

These decisions close open questions from `SPEC.md` for V1.

| Topic | V1 Decision |
| --- | --- |
| Wish rich text | V1 Wish content supports plain text with line breaks. No formatting controls, lists, images, attachments, embeds, custom colors, tables, or advanced layout. |
| Wish links | URLs can appear directly in Wish content as text. The UI should make detected URLs interactive when displayed. Links are not stored in a dedicated field. |
| Participant identity persistence | V1 stores the selected Participant id in browser `localStorage`, scoped by Event id. This is convenience state, not authentication. The server must still validate `X-Participant-Id` on every relevant request. |

## 4. V1 Scope

## 4.1 In Scope

- Event creation and access through shareable links.
- Participant creation and identity selection within an Event.
- Wishlist management for each Participant.
- Wish creation, editing, and deletion by the Wisher.
- Wish content with line breaks and interactive URLs.
- Event Wishes listing from the selected Participant perspective.
- Reservation and Contributor management.
- Visibility and permission enforcement for Wishers and Purchase Coordination.
- Persistent storage.
- REST API used by the Web UI.
- Mobile-first Angular Progressive Web App.

## 4.2 Out Of Scope (V1)

- User accounts.
- Event lifecycle management.
- Event owner or administrator roles.
- Event link revocation or regeneration.
- Purchase Coordination notes.

## 5. Architecture

## 5.1 Runtime Components

- `server/` — Fastify REST API and backend application.
- `web/` — Angular Progressive Web App.
- `packages/patterns/` — framework-independent DDD and CQRS base interfaces/classes.
- `packages/db/` — Drizzle schema, migrations, and database client helpers.
- `packages/shared/` — shared API contracts, schemas, and types when useful.

V1 uses a simple pnpm workspace for the monorepo.

The Web UI communicates with the server through the REST API.

The server owns persistence, domain behavior, visibility rules, permission enforcement, and projection updates.

## 5.2 Data Stores

- Primary: PostgreSQL.
- Local development: Docker Compose PostgreSQL.
- Production: PostgreSQL-compatible managed provider.

Drizzle is used for schema definition, typed database access, and migrations.

## 6. Canonical Data Model (V1)

All core tables include `id`, `created_at`, and `updated_at` unless noted.

## 6.1 `events`

- `id` uuid pk
- `name` text not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

Constraints:

- `name` must not be blank.

Link behavior:

- V1 shareable Event links use the Event id.

## 6.2 `participants`

- `id` uuid pk
- `event_id` uuid fk `events.id` not null
- `name` text not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

Constraints:

- `name` must not be blank.
- unique (`event_id`, `name`)

## 6.3 `wishes`

- `id` uuid pk
- `event_id` uuid fk `events.id` not null
- `wisher_id` uuid fk `participants.id` not null
- `content` text not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

Constraints:

- `content` must not be blank.

Implementation note:

- `event_id` is intentionally stored even though it can be derived from `wisher_id`.
- This keeps Event-scoped queries, indexes, permission checks, and agent review simpler.
- `event_id` must match the Event of `wisher_id`.

## 6.4 `reservations`

- `id` uuid pk
- `wish_id` uuid fk `wishes.id` not null unique
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

Constraints:

- a Wish has at most one Reservation.

## 6.5 `reservation_contributors`

- `id` uuid pk
- `reservation_id` uuid fk `reservations.id` not null
- `participant_id` uuid fk `participants.id` not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

Constraints:

- unique (`reservation_id`, `participant_id`)

## 7. Visibility And Permission Semantics

All Event content is evaluated from the perspective of a selected Participant identity.

### Event Entry

A person can access an Event entry flow through the Event shareable link.

A person must choose an existing Participant or create a new Participant before accessing Event content.

The Event entry read model returned by `GET /events/:eventId` includes the Event's Participants for identity selection.

### Wishes

A Participant can create Wishes only for themselves.

A Participant can edit and delete only their own Wishes.

Deleting a Wish deletes its Reservation and Reservation Contributors in the same operation.

A Participant can view:

- their own Wishes;
- Wishes created by other Participants in the same Event.

### Purchase Coordination

A Participant can view Purchase Coordination only for Wishes they do not own.

A Participant can create or modify Purchase Coordination only for Wishes they do not own.

A Wisher must not see whether their own Wish has a Reservation or who contributes to it.

### Reservations

A Participant can create a Reservation for another Participant's Wish by becoming its first Contributor.

A Participant can join an existing Reservation for another Participant's Wish.

A Participant can add another Participant as a Contributor to an existing Reservation, as long as the added Participant is not the Wisher.

A Participant does not need to already be a Contributor to add another Participant as a Contributor.

A Contributor can leave a Reservation.

Any Participant who can view a Reservation can remove a Contributor from it. This includes removing themselves or correcting another Contributor.

When the last Contributor leaves a Reservation, the Reservation is deleted.

## 8. API Contract (REST)

All endpoints are under `/api` and return JSON.

Endpoints that depend on the selected Participant identity use the `X-Participant-Id` header.

Zod schemas validate request bodies, route parameters, query parameters, and shared response contracts when useful.

### Events

- `POST /events`
- `GET /events/:eventId` - returns the Event entry read model, including the Event's Participants for create/select identity flow.

### Participants

- `POST /events/:eventId/participants`

### Wishes

- `GET /events/:eventId/wishes` - returns Event Wishes with Purchase Coordination filtered for the selected Participant.
- `GET /participants/:participantId/wishes`
- `POST /participants/:participantId/wishes`
- `PATCH /wishes/:wishId`
- `DELETE /wishes/:wishId`

### Reservations

- `POST /wishes/:wishId/reservation`
- `POST /reservations/:reservationId/contributors`
- `DELETE /reservations/:reservationId/contributors/:participantId`

### Identity Header Contract

`X-Participant-Id` identifies the selected Participant for requests that need viewer or actor context.

The server must verify that the selected Participant belongs to the relevant Event before applying visibility or mutation rules.

### Error Semantics

- `400` validation error.
- `404` resource not found.
- `409` state conflict.
- `422` business rule violation.
- `500` server error.

## 9. UI Requirements

The Web UI is an Angular Progressive Web App.

### Required Product Surfaces

V1 must provide the following product surfaces:

- **Event creation** - create an Event and expose the shareable Event link.
- **Event entry** - choose an existing Participant or create a new Participant for an Event.
- **Main Event experience** - browse Event Wishes from the selected Participant perspective.
- **Wishlist management** - create, edit, and delete Wishes owned by the selected Participant.
- **Purchase Coordination** - create Reservations, add Contributors, and remove Contributors for Wishes visible to the selected Participant.

### Navigation Contract

The UI must support these navigation states:

- no Event selected;
- Event selected, no Participant selected;
- Event selected with Participant selected;
- Wishlist management for the selected Participant;
- Purchase Coordination for a Wish visible to the selected Participant.

The concrete route structure is an implementation detail, but it must preserve deep-linking to an Event.

### Responsive Behavior

Desktop may present Wishlist management and Event Wishes together in one main Event experience.

Mobile may split the same capabilities across tabs, panels, or subviews.

The same visibility and permission rules apply across all responsive layouts.

### PWA Requirements

- mobile-first responsive layout;
- installable PWA where supported by the browser;
- app manifest;
- service worker setup;
- static application asset caching;
- no service worker caching for REST API responses containing Event, Participant, Wish, Reservation, Contributor, or Purchase Coordination data.

## 10. Operational Requirements

V1 must support local development and production deployment with minimal operational complexity.

### Environment

- Node.js runtime.
- pnpm workspace.
- PostgreSQL configured through `DATABASE_URL`.
- Local PostgreSQL through Docker Compose.

### Configuration

The server must fail fast when required environment variables are missing or invalid.

Environment variables are validated with Zod.

### Database

Database schema is managed by Drizzle.

Database migrations are managed by Drizzle Kit.

### Logging

The server should produce structured logs suitable for local debugging and production troubleshooting.

## 11. Testing Strategy

### 11.1 Unit Tests

- Wish ownership and editing rules.
- Reservation and Contributor rules.
- Purchase Coordination visibility rules.

### 11.2 Integration Tests

- REST permission enforcement through `X-Participant-Id`.
- Event Wishes visibility filtering.
- Reservation lifecycle with PostgreSQL persistence.

### 11.3 End-to-End Tests

- create Event -> create/select Participants -> create Wish -> reserve Wish -> verify Wisher is not spoiled.

### 11.4 Regression Suite Minimum

A release candidate is blocked unless these pass:

1. anti-spoil visibility regression;
2. reservation lifecycle regression;
3. core browser workflow regression.

## 12. Delivery Plan

Each milestone is a vertical product slice unless explicitly stated otherwise.

### Milestone 1: Project Foundation

Deliver a runnable monorepo foundation with no product feature beyond a working application shell.

- pnpm workspace.
- `server/`, `web/`, `packages/patterns/`, `packages/db/`, `packages/shared/`.
- Docker Compose PostgreSQL.
- Drizzle setup and initial migration.
- Fastify server bootstrap with healthcheck.
- Angular PWA bootstrap with app manifest, service worker setup, and mobile-first application shell.
- Root commands for local development, cheap default verification, and PR-ready verification.

### Milestone 2: Event Entry

- Event creation.
- Shareable Event link.
- Event entry through the link.
- Participant creation and selection.
- Remember selected Participant when possible.

### Milestone 3: Wishlist

- Wish creation, editing, and deletion.
- Wish content with line breaks and interactive URLs.
- Wishlist display for the selected Participant.

### Milestone 4: Event Wishes

- Event-level Wishes listing.
- Visibility-filtered Event Wishes response.
- Event Wishes browsing from the selected Participant perspective.

### Milestone 5: Purchase Coordination

- Reservation creation.
- Contributor management.
- Reservation removal when the last Contributor leaves.
- Purchase Coordination hidden from the Wisher.

## 13. Acceptance Criteria (Release Gate)

V1 is complete only when all criteria are true:

1. A person can create an Event and share a link that opens the Event entry flow.
2. Multiple Participants can be created in the same Event and selected as the active identity.
3. A Participant can create, edit, and delete their own Wishes.
4. Event Wishes are visible from the perspective of the selected Participant.
5. A Participant can reserve a Wish owned by another Participant.
6. Participants can be added to and removed from a Reservation.
7. Removing the last Contributor removes the Reservation.
8. Purchase Coordination is never visible to the Wisher of the Wish.
9. The Web UI is usable as a mobile-first Angular Progressive Web App.
