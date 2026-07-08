import { randomUUID } from "node:crypto";

import { events, type Database } from "@idkdo/db";

export type CreateEventInput = {
  readonly name: string;
};

export type CreateEventResult = {
  readonly id: string;
};

export async function createEvent(
  db: Database,
  input: CreateEventInput,
): Promise<CreateEventResult> {
  const id = randomUUID();

  await db.insert(events).values({
    id,
    name: input.name,
  });

  return { id };
}
