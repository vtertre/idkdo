import { eventEntryPageProjection, type Database } from "@idkdo/db";
import type { GetEventEntryPageResponse } from "@idkdo/shared";
import type { QueryHandler } from "@idkdo/patterns";
import { eq } from "drizzle-orm";

import { GetEventEntryPageQuery } from "./get-event-entry-page-query.js";

export class GetEventEntryPageQueryHandler
  implements QueryHandler<GetEventEntryPageQuery, GetEventEntryPageResponse | null>
{
  constructor(private readonly database: Database) {}

  async execute(
    query: GetEventEntryPageQuery,
  ): Promise<GetEventEntryPageResponse | null> {
    const rows = await this.database
      .select()
      .from(eventEntryPageProjection)
      .where(eq(eventEntryPageProjection.id, query.eventId.toString()))
      .limit(1);
    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      name: row.name,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
