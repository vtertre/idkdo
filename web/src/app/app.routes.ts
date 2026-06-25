import type { Routes } from "@angular/router";

import { eventEntryState } from "./features/events/data-access/event-entry-state";
import { CreateEventPage } from "./features/events/pages/create-event-page/create-event-page";
import { EventEntryPage } from "./features/events/pages/event-entry-page/event-entry-page";

export const routes: Routes = [
  { path: "", component: CreateEventPage },
  {
    path: "events/:eventId",
    component: EventEntryPage,
    resolve: { [eventEntryState.routeDataKey]: eventEntryState.resolve },
  },
  { path: "**", redirectTo: "" },
];
