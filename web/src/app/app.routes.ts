import type { Routes } from "@angular/router";

import { CreateEventPage } from "./features/events/pages/create-event-page/create-event-page";
import { EventEntryPage } from "./features/events/pages/event-entry-page/event-entry-page";

export const routes: Routes = [
  { path: "", component: CreateEventPage },
  { path: "events/:eventId", component: EventEntryPage },
  { path: "**", redirectTo: "" },
];
