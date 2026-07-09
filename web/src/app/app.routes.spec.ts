import { routes } from "./app.routes";
import { eventEntryRoute } from "./features/events/data-access/event-entry-route";
import { selectedParticipantGuard } from "./features/events/data-access/selected-participant-guard";
import { EventEntryPage } from "./features/events/pages/event-entry-page/event-entry-page";
import { EventHomePage } from "./features/events/pages/event-home-page/event-home-page";

describe("routes", () => {
  it("declares entry before the guarded main Event route", () => {
    const entryRoute = routes.find((route) => route.path === "events/:eventId/entry");
    const mainRoute = routes.find((route) => route.path === "events/:eventId");

    expect(routes.indexOf(entryRoute!)).toBeLessThan(routes.indexOf(mainRoute!));
    expect(entryRoute).toMatchObject({
      component: EventEntryPage,
      resolve: { [eventEntryRoute.dataKey]: eventEntryRoute.resolve },
    });
    expect(mainRoute).toMatchObject({
      canActivate: [selectedParticipantGuard],
      component: EventHomePage,
      resolve: { [eventEntryRoute.dataKey]: eventEntryRoute.resolve },
    });
  });
});
