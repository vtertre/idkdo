import { ApplicationRef as ApplicationRefForTest } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import type { GetEventEntryPageResponse } from "@idkdo/shared";

import { EventRepository, EventRepositoryError } from "../../data-access/event-repository";
import { EventEntryPage } from "./event-entry-page";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";
const loadedEvent: GetEventEntryPageResponse = {
  createdAt: "2026-06-23T12:00:00.000Z",
  id: eventId,
  name: "Christmas 2026",
  updatedAt: "2026-06-23T12:00:00.000Z",
};

describe("EventEntryPage", () => {
  const getEvent = vi.fn<EventRepository["getEvent"]>();

  beforeEach(() => {
    getEvent.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: "events/:eventId", component: EventEntryPage }]),
        { provide: EventRepository, useValue: { getEvent } },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the route Event and renders its absolute share link", async () => {
    getEvent.mockResolvedValue(loadedEvent);
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(
      `/events/${eventId}`,
      EventEntryPage,
    );
    await TestBed.inject(ApplicationRefForTest).whenStable();
    harness.detectChanges();

    expect(page).toBeInstanceOf(EventEntryPage);
    expect(getEvent).toHaveBeenCalledWith(eventId);
    expect(harness.routeNativeElement?.textContent).toContain("Christmas 2026");
    const link = harness.routeNativeElement?.querySelector<HTMLAnchorElement>(".share a");
    expect(link?.href).toBe(`${window.location.origin}/events/${eventId}`);
    expect(harness.routeNativeElement?.textContent).toContain(
      "Participant entry is the next step",
    );
  });

  it("shows loading while the Event request is pending", async () => {
    getEvent.mockReturnValue(new Promise(() => undefined));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/events/${eventId}`, EventEntryPage);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain("Loading Event");
  });

  it("retries transient not-found responses and then succeeds", async () => {
    vi.useFakeTimers();
    getEvent
      .mockRejectedValueOnce(new EventRepositoryError("Not found.", 404, "NOT_FOUND"))
      .mockRejectedValueOnce(new EventRepositoryError("Not found.", 404, "NOT_FOUND"))
      .mockResolvedValue(loadedEvent);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/events/${eventId}`, EventEntryPage);

    await vi.advanceTimersByTimeAsync(150);
    harness.detectChanges();

    expect(getEvent).toHaveBeenCalledTimes(3);
    expect(harness.routeNativeElement?.textContent).toContain("Christmas 2026");
  });

  it("stops after four not-found retries", async () => {
    vi.useFakeTimers();
    getEvent.mockRejectedValue(
      new EventRepositoryError("Event not found.", 404, "NOT_FOUND"),
    );
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/events/${eventId}`, EventEntryPage);

    await vi.advanceTimersByTimeAsync(750);
    harness.detectChanges();

    expect(getEvent).toHaveBeenCalledTimes(5);
    expect(harness.routeNativeElement?.textContent).toContain("Event not found.");
  });

  it("does not retry server failures", async () => {
    getEvent.mockRejectedValue(
      new EventRepositoryError("Server unavailable.", 500, "FAILURE"),
    );
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/events/${eventId}`, EventEntryPage);
    await TestBed.inject(ApplicationRefForTest).whenStable();
    harness.detectChanges();

    expect(getEvent).toHaveBeenCalledOnce();
    expect(harness.routeNativeElement?.textContent).toContain("Server unavailable.");
  });
});
