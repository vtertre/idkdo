# idkdo

idkdo helps families and close groups coordinate gifts without spoiling surprises.

## The Vision

Gift coordination should feel as simple as sharing a family chat link, while still preventing duplicate purchases and preserving the surprise for the person receiving the gift.

idkdo should become a lightweight shared space for recurring family events: Christmas, birthdays, secret santa, and similar occasions.

## The Problem

Families often maintain gift ideas in informal tools like notes apps or shared messages.

Those tools are good for listing wishes, but poor at coordinating who buys what. People end up duplicating purchases, spoiling surprises, or coordinating through scattered side conversations.

## What This Is

idkdo is a shared gift coordination space where:

- people create an Event;
- Participants join through a shared link;
- each Participant maintains their own Wishlist;
- other Participants coordinate Reservations around those Wishes;
- the Wisher does not see Purchase Coordination for their own Wishes.

## Architecture

Two layers:

### 1. Product Surface

The user-facing web app where families create Events, choose Participants, manage Wishlists, and coordinate Reservations.

### 2. Coordination Backend

The API and persistence layer that enforce the domain rules, especially visibility and permission rules around Wishers and Purchase Coordination.

## Core Principle

A Participant should be able to use idkdo naturally without needing to understand hidden coordination rules. The surprise should be preserved by the product itself.
