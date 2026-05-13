# Specification

Target specification for the gift coordination product.
Living document, updated incrementally during product and domain refinement.

For the product definition, see `PRODUCT.md`.
For the implementation contract of the current version, see `SPEC-implementation.md`.

---

## 1. Event Model [DRAFT]

An Event is the shared space where a group coordinates gifts.

Events are created so a family or close group can gather participants, wishlists, and purchase coordination around a shared occasion.

### Fields (Draft)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary identifier. |
| `name` | string | User-facing event name. |
| `createdAt` | timestamp | Creation time. |
| `updatedAt` | timestamp | Last update time. |

Events do not have dates. Date-like information can be included in the Event name when useful.

### Participants

An Event has Participants.

Participants are the people present in the Event. See Participant And Identity Model.

### Lifecycle

Events can have lifecycle states such as active, archived, or deleted.

### Event Roles

Events can have owner or administrator roles.

### Access Link

An Event can be accessed through a shareable link.

The link grants access to the Event entry flow. It does not prove who the person is inside the Event.

Event links can be revoked or regenerated.

---

## 2. Participant And Identity Model [DRAFT]

A Participant is a person present in an Event.

Identity is the selected Participant used by a person while they interact with an Event.

The product uses lightweight identity selection: choosing a Participant determines what the person can see and do in the Event, but it is not strong authentication.

Intentional impersonation is outside the core product's problem space.

### Fields (Draft)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary identifier. |
| `eventId` | uuid | Event this Participant belongs to. |
| `name` | string | User-facing display name. |
| `createdAt` | timestamp | Creation time. |
| `updatedAt` | timestamp | Last update time. |

### Event Membership

A Participant belongs to exactly one Event.

Participant names identify people within an Event for user-facing purposes.

Participant names should be unique within an Event to keep identity selection clear.

### Identity Selection

A person entering an Event chooses an existing Participant or creates a new one.

The selected Participant becomes the person's Identity for that Event.

When possible, the product should remember the last selected Participant for an Event so returning users do not have to choose their Identity every time.

---

## 3. Wishlist And Wish Model [DRAFT]

A Wishlist is the set of Wishes owned by a Participant in an Event.

A Wish is a gift idea a Participant would like to receive.

The Participant who owns a Wish is the Wisher.

### Wish Fields (Draft)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary identifier. |
| `eventId` | uuid | Event this Wish belongs to. |
| `wisherId` | uuid | Participant who owns the Wish. |
| `content` | rich text | User-facing wish content. |
| `createdAt` | timestamp | Creation time. |
| `updatedAt` | timestamp | Last update time. |

### Wishlist Ownership

Each Participant has one Wishlist per Event.

A Wish belongs to exactly one Wisher.

A Wish belongs to the same Event as its Wisher.

### Wish Content

A Wish should be understandable enough for other Participants to decide whether they can take care of it.

The core Wish content is a single rich text field.

Rich text allows a Participant to express a Wish with simple formatting and links without splitting the Wish into separate product fields too early.

### Wish Lifecycle

Wishes can be created, edited, and deleted by their Wisher.

Deleting a Wish also removes its Purchase Coordination.

### Open Questions

- What rich text capabilities should Wish content support?
- Should links be represented as explicit rich text marks, plain URLs in text, or both?

---

## 4. Purchase Coordination [DRAFT]

Purchase Coordination is how Participants organize who will take care of a Wish.

Purchase Coordination exists for a Wish, but it is not visible to the Wisher of that Wish.

### Reservation

A Reservation is the declared intention of one or more Participants to take care of a Wish.

A Wish can have at most one Reservation.

A Reservation belongs to exactly one Wish.

### Contributor

A Contributor is a Participant who takes part in a Reservation.

A Reservation has one or more Contributors.

A Contributor must belong to the same Event as the Wish being reserved.

The Wisher of a Wish cannot be a Contributor to that Wish's Reservation.

### Reservation Lifecycle

A Participant can create a Reservation for a Wish by becoming its first Contributor.

A Participant can join an existing Reservation.

A Participant can add another Participant as a Contributor to an existing Reservation.

A Contributor can leave a Reservation.

When the last Contributor leaves a Reservation, the Reservation is removed.

### Purchase Coordination Content

Purchase Coordination includes:
- whether a Wish has a Reservation;
- the Contributors to that Reservation.

---

## 5. Visibility And Permissions [DRAFT]

The selected Identity determines what a person can see and do inside an Event.

A Wisher can see their own Wishes, but cannot see Purchase Coordination for those Wishes.

Participants can see Wishes created by other Participants in the same Event.

Participants can see and modify Purchase Coordination for Wishes they do not own.

Only the Wisher can edit or delete a Wish.

Actions that would reveal or modify Purchase Coordination for a Wish are not available to the Wisher of that Wish.

The Wisher of a Wish must not be able to infer from the product UI whether their Wish has been reserved or who contributes to it.

---

## 6. Frontend / UI [DRAFT]

The UI should optimize for low-friction family usage, especially from mobile devices and shared links.

### Primary Views

1. Event creation.
   A simple entry point for creating an Event and obtaining its shareable link.

2. Event entry.
   The flow where a person chooses an existing Participant or creates a new Participant.

3. Event overview.
   The main Event space after Identity selection. It should let Participants browse wishlists, manage their own Wishes, and coordinate purchases for other Participants' Wishes.

### UI Rules

- The Wisher experience should not display hidden Purchase Coordination states.
- Purchase Coordination should be understandable at a glance for Wishes created by other Participants.
- Mobile usage should be treated as a primary experience.

---

## 7. V1 Scope (MVP) [DRAFT]

V1 must demonstrate the complete gift coordination loop end-to-end, from Event creation to Purchase Coordination visibility.

### Must Have (V1)

- **Event creation and access** — create an Event with a name, expose a shareable link, and allow people to enter through that link.
- **Participant identity flow** — choose an existing Participant or create a new Participant with a display name before using an Event.
- **Wishlist management** — each Participant has a Wishlist and can create, edit, and delete their own Wishes.
- **Participant browsing** — view Participants and their Wishes within an Event.
- **Purchase Coordination** — create a Reservation for another Participant's Wish, join it, add Contributors, leave it, and remove it when the last Contributor leaves.
- **Visibility and permission enforcement** — hide Purchase Coordination from the Wisher and prevent actions that would expose or modify it for their own Wishes.
- **Persistent storage** — Events, Participants, Wishes, Reservations, and Contributors survive application restarts.
- **Web UI** — provide the core user flows through a mobile-friendly browser interface.
- **REST API** — expose the product behavior through an API used by the Web UI.

### Not V1

- User accounts.
- Strong authentication.
- Protection against intentional Participant impersonation.
- Event lifecycle management.
- Event owner or administrator roles.
- Event link revocation or regeneration.
- Purchase Coordination notes.

---

## 8. Anti-Requirements

Things the product explicitly does not do:

- **Not a shopping platform** — the product does not help users discover, compare, or buy products.
- **Not a payment or reimbursement system** — the product does not track or settle money between Participants.
- **Not a general task manager** — Purchase Coordination exists only to coordinate gifts, not to manage arbitrary work.
- **Not a social network** — the product is built around private Events shared by link, not public profiles or feeds.

---

## 9. Principles (Consolidated)

The following principles guide this specification:

1. **Preserve the surprise.** Purchase Coordination must not be exposed to the Wisher.
2. **Keep coordination simple.** The core model is Events, Participants, Wishes, Reservations, and Contributors.
3. **Trust the social group.** The product assumes cooperative family or close-group usage.
4. **Optimize for low-friction usage.** Shared links and lightweight identity selection are core to the experience.

---

## Open Questions

- What rich text capabilities should Wish content support?
- Should links be represented as explicit rich text marks, plain URLs in text, or both?
