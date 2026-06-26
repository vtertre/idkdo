import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export type ParticipantSummaryRecord = {
  readonly createdAt: string;
  readonly eventId: string;
  readonly id: string;
  readonly name: string;
  readonly updatedAt: string;
};

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

export const eventEntryPageProjection = pgTable("event_entry_page_projection", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  participants: jsonb("participants")
    .$type<ParticipantSummaryRecord[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const schema = {
  eventEntryPageProjection,
  events,
  participants,
};
