import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

export const eventEntryPageProjection = pgTable("event_entry_page_projection", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const schema = {
  eventEntryPageProjection,
  events,
};
