# Product Definition

## What It Is

The product is a lightweight gift coordination app for families and close groups.

For a shared event, participants maintain their own wishlists while other participants coordinate who will take care of each gift. The product protects the surprise by hiding purchase coordination from the participant who made the wish.

The product favors low-friction family usage over strict identity security.

## Core Concepts

### Event

An event is the shared space where a group coordinates gifts.

An event has a name and participants. People access an event through a shared link.

Examples of events include Christmas 2026, Alice's birthday, or a family secret santa.

### Participant

A participant is a person present in an event.

When someone joins an event, they choose an existing participant or create a new one by providing a name. Each participant has a wishlist in the event.

A wish is something the participant would like to receive.

Identity is intentionally lightweight: choosing a participant determines the in-event experience, but it is not strong authentication.

### Purchase Coordination

Purchase coordination is how participants avoid duplicate purchases and organize shared gifts.

Participants coordinate around wishes created by other participants. Coordination answers simple questions: is someone taking care of this wish, and who is involved?

Purchase coordination should preserve the surprise for the participant who made the wish.

## Principles

1. Low friction over strict identity.
   The product should feel easy to join from a family chat link. Strong authentication is not part of the core experience.

2. Preserve the surprise.
   The product exists to coordinate gifts without turning the recipient into a project manager for their own presents.

3. Trust the social group.
   The product assumes a cooperative family or close-group context. It should not over-design against intentional bad behavior.

4. Keep coordination simple.
   The core loop is: create an event, choose an identity, add wishes, coordinate around others' wishes.

5. Use familiar language.
   The product should feel understandable to non-technical family members, not like an admin tool.

## User Flow

1. Someone creates an event.
2. They share the event link with others.
3. A person opens the event link and chooses or creates a participant.
4. They add wishes to their own wishlist.
5. Other participants view those wishes and coordinate purchases.
6. The participant who made a wish can still see that wish, but not the purchase coordination around it.

## Product Boundaries

Do:
- prioritize simple coordination over strict security;
- make event entry fast and understandable;
- make anti-spoil behavior central to the experience;
- keep concepts understandable for non-technical family members.

Do not:
- turn the product into a general shopping platform;
- make accounts or authentication central to the first product shape;
- add payment, reimbursement, notification, or import features before the core coordination loop is solid;
- expose purchase coordination to the participant who made the wish.

## Specific Design Goals

1. Event creation should be fast.
   A fresh user should be able to create an event and get a shareable link in under a minute.

2. Joining should not feel like signing up.
   Opening an event should lead to choosing or creating a participant, not creating an account.

3. Coordination should be visible at a glance.
   For wishes created by others, participants should quickly understand whether a wish is already being handled and who is involved.

4. The product should work well from a family chat.
   Shared links, mobile layouts, and short interaction paths matter more than dashboard depth.

5. Actions should feel reversible.
   Users should be able to edit wishes, leave reservations, and correct simple mistakes without needing admin intervention.

## Further Detail

Long-horizon functional behavior belongs in `SPEC.md`.

The implementation contract for the current version belongs in `SPEC-implementation.md`.
