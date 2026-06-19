import type { GetEventEntryPageResponse } from "@idkdo/shared";
import type { Query, Uuid, queryResultType } from "@idkdo/patterns";

export class GetEventEntryPageQuery
  implements Query<GetEventEntryPageResponse | null>
{
  declare readonly [queryResultType]: GetEventEntryPageResponse | null;

  constructor(readonly eventId: Uuid) {}
}
