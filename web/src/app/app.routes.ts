import type { Routes } from "@angular/router";

import { eventEntryRoute } from "./features/events/data-access/event-entry-route";
import { selectedParticipantGuard } from "./features/events/data-access/selected-participant-guard";
import { CreateEventPage } from "./features/events/pages/create-event-page/create-event-page";
import { EventEntryPage } from "./features/events/pages/event-entry-page/event-entry-page";
import { EventHomePage } from "./features/events/pages/event-home-page/event-home-page";
import { EventUnavailablePage } from "./features/events/pages/event-unavailable-page/event-unavailable-page";

export const routes: Routes = [
  { path: "", component: CreateEventPage },
  {
    path: "events/:eventId/entry",
    component: EventEntryPage,
    resolve: { [eventEntryRoute.dataKey]: eventEntryRoute.resolve },
  },
  { path: "events/:eventId/unavailable", component: EventUnavailablePage },
  {
    path: "events/:eventId",
    component: EventHomePage,
    canActivate: [selectedParticipantGuard],
    resolve: { [eventEntryRoute.dataKey]: eventEntryRoute.resolve },
  },
  { path: "**", redirectTo: "" },
];
