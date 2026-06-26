import { eventEntryPageProjection, type Database } from "@idkdo/db";
import type {
  GetEventEntryPageResponse,
  ParticipantSummary,
} from "@idkdo/shared";
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
      participants: sortParticipants(row.participants),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function sortParticipants(
  participants: readonly ParticipantSummary[],
): ParticipantSummary[] {
  return [...participants].sort((left, right) => {
    const createdAtOrder = left.createdAt.localeCompare(right.createdAt);

    if (createdAtOrder !== 0) {
      return createdAtOrder;
    }

    return left.id.localeCompare(right.id);
  });
}
