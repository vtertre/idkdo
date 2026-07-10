import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Foundation-only table; product fields are added by later feature migrations.
export const events = pgTable("events", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  ...timestamps(),
});

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    name: text("name").notNull(),
    ...timestamps(),
  },
  (table) => [unique().on(table.eventId, table.name)],
);

export const wishes = pgTable(
  "wishes",
  {
    id: uuid("id").primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    wisherId: uuid("wisher_id")
      .notNull()
      .references(() => participants.id),
    content: text("content").notNull(),
    ...timestamps(),
  },
  (table) => [index().on(table.eventId), index().on(table.wisherId)],
);

export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey(),
  wishId: uuid("wish_id")
    .notNull()
    .unique()
    .references(() => wishes.id, { onDelete: "cascade" }),
  ...timestamps(),
});

export const reservationContributors = pgTable(
  "reservation_contributors",
  {
    id: uuid("id").primaryKey(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id),
    ...timestamps(),
  },
  (table) => [unique().on(table.reservationId, table.participantId)],
);

export const schema = {
  events,
  participants,
  reservationContributors,
  reservations,
  wishes,
};
