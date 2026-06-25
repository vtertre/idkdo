import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import type { GetEventEntryPageResponse } from "@idkdo/shared";
import type { WritableSignal } from "@angular/core";
import { defer, of, throwError } from "rxjs";

import { eventEntryRoute } from "../../data-access/event-entry-route";
import { EventRepositoryError } from "../../data-access/event-repository-error";
import { EventRepository } from "../../data-access/event-repository";
import { EventEntryPage } from "./event-entry-page";
import { EventUnavailablePage } from "../event-unavailable-page/event-unavailable-page";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";
const loadedEvent: GetEventEntryPageResponse = {
  createdAt: "2026-06-23T12:00:00.000Z",
  id: eventId,
  name: "Noël 2026",
  updatedAt: "2026-06-23T12:00:00.000Z",
};

const getEvent = vi.fn<EventRepository["getEvent"]>();

describe("EventEntryPage rendering", () => {
  beforeEach(() => {
    getEvent.mockReset();
    configureEventEntryPageTest();
  });

  it("resolves the route Event before rendering its absolute share link", async () => {
    getEvent.mockReturnValue(of(loadedEvent));
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(
      `/events/${eventId}`,
      EventEntryPage,
    );
    harness.detectChanges();

    expect(page).toBeInstanceOf(EventEntryPage);
    expect(getEvent).toHaveBeenCalledWith(eventId);
    expect(harness.routeNativeElement?.textContent).toContain("Noël 2026");
    const link = harness.routeNativeElement?.querySelector<HTMLAnchorElement>(".share a");
    expect(link?.href).toBe(`${window.location.origin}/events/${eventId}`);
    expect(harness.routeNativeElement?.textContent).toContain(
      "L’entrée des participants est la prochaine étape",
    );
  });

  it("injects the resolved Event as a writable signal", async () => {
    getEvent.mockReturnValue(of(loadedEvent));
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(
      `/events/${eventId}`,
      EventEntryPage,
    );
    const eventSignal = getEventSignal(page);

    eventSignal.set({ ...loadedEvent, name: "Anniversaire d’Alice" });
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      "Anniversaire d’Alice",
    );
  });
});

describe("EventEntryPage resolver", () => {
  beforeEach(() => {
    getEvent.mockReset();
    configureEventEntryPageTest();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries transient not-found responses and then succeeds", async () => {
    vi.useFakeTimers();
    let subscriptions = 0;
    getEvent.mockReturnValue(
      defer(() => {
        subscriptions += 1;
        return subscriptions < 3
          ? throwError(
              () => new EventRepositoryError("Not found.", 404, "NOT_FOUND"),
            )
          : of(loadedEvent);
      }),
    );
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl(`/events/${eventId}`);

    await vi.advanceTimersByTimeAsync(150);
    await navigation;
    harness.detectChanges();

    expect(getEvent).toHaveBeenCalledOnce();
    expect(subscriptions).toBe(3);
    expect(harness.routeNativeElement?.textContent).toContain("Noël 2026");
  });

  it("redirects to the unavailable page after four not-found retries", async () => {
    vi.useFakeTimers();
    let subscriptions = 0;
    getEvent.mockReturnValue(
      defer(() => {
        subscriptions += 1;
        return throwError(
          () => new EventRepositoryError("Event not found.", 404, "NOT_FOUND"),
        );
      }),
    );
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl(`/events/${eventId}`);

    await vi.advanceTimersByTimeAsync(750);
    await navigation;
    harness.detectChanges();

    expect(getEvent).toHaveBeenCalledOnce();
    expect(subscriptions).toBe(5);
    expect(harness.routeNativeElement?.textContent).toContain(
      "Événement indisponible",
    );
  });

  it("does not retry server failures before redirecting to the unavailable page", async () => {
    let subscriptions = 0;
    getEvent.mockReturnValue(
      defer(() => {
        subscriptions += 1;
        return throwError(
          () => new EventRepositoryError("Server unavailable.", 500, "FAILURE"),
        );
      }),
    );
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/events/${eventId}`);
    harness.detectChanges();

    expect(getEvent).toHaveBeenCalledOnce();
    expect(subscriptions).toBe(1);
    expect(harness.routeNativeElement?.textContent).toContain(
      "Événement indisponible",
    );
  });
});

function configureEventEntryPageTest(): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: "events/:eventId",
          component: EventEntryPage,
          resolve: {
            [eventEntryRoute.dataKey]: eventEntryRoute.resolve,
          },
        },
        {
          path: "events/:eventId/unavailable",
          component: EventUnavailablePage,
        },
      ]),
      { provide: EventRepository, useValue: { getEvent } },
    ],
  });
}

function getEventSignal(
  page: EventEntryPage,
): WritableSignal<GetEventEntryPageResponse> {
  return (
    page as unknown as {
      event: WritableSignal<GetEventEntryPageResponse>;
    }
  ).event;
}
