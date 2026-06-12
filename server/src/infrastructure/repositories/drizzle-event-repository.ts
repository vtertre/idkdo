import { events, type Database } from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import { eq } from "drizzle-orm";
import { Temporal } from "@js-temporal/polyfill";

import { Event } from "../../domain/entities/event.js";
import type { EventRepository } from "../../domain/repositories/event-repository.js";
import { EventName } from "../../domain/value-objects/event-name.js";

export class DrizzleEventRepository implements EventRepository {
  constructor(private readonly database: Database) {}

  async add(event: Event): Promise<void> {
    await this.database.insert(events).values({
      createdAt: instantToDate(event.createdAt),
      id: event.id.toString(),
      name: event.name.value,
      updatedAt: instantToDate(event.updatedAt),
    });
  }

  async get(id: Uuid): Promise<Event | null> {
    const rows = await this.database
      .select()
      .from(events)
      .where(eq(events.id, id.toString()))
      .limit(1);
    const row = rows[0];

    if (!row) {
      return null;
    }

    return eventFromRow(row);
  }

  async update(event: Event): Promise<void> {
    await this.database
      .update(events)
      .set({
        name: event.name.value,
        updatedAt: instantToDate(event.updatedAt),
      })
      .where(eq(events.id, event.id.toString()));
  }

  async exists(id: Uuid): Promise<boolean> {
    const rows = await this.database
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, id.toString()))
      .limit(1);

    return rows.length > 0;
  }
}

type EventRow = typeof events.$inferSelect;

function eventFromRow(row: EventRow): Event {
  return Event.rehydrate({
    createdAt: dateToInstant(row.createdAt),
    id: Uuid.parse(row.id),
    name: EventName.create(row.name),
    updatedAt: dateToInstant(row.updatedAt),
  });
}

function dateToInstant(date: Date): Temporal.Instant {
  return Temporal.Instant.from(date.toISOString());
}

function instantToDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}
