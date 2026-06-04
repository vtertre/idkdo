import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Foundation-only table; product fields are added by later feature migrations.
export const events = pgTable("events", {
  id: uuid("id").primaryKey(),
  ...timestamps(),
});

export const schema = {
  events,
};
