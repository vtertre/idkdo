import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import type { GetEventEntryPageResponse, ParticipantSummary } from "@idkdo/shared";
import { of } from "rxjs";

import { SelectedParticipantContext } from "../../../../core/identity/selected-participant-context";
import { WishRepository } from "../../../wishes/data-access/wish-repository";
import { eventEntryRoute } from "../../data-access/event-entry-route";
import { SelectedParticipantStorage } from "../../data-access/selected-participant-storage";
import { EventHomePage } from "./event-home-page";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";
const alice: ParticipantSummary = {
  createdAt: "2026-06-23T12:30:00.000Z",
  eventId,
  id: "3b8dc5a0-9dbc-4e14-99a7-750df7c86fbb",
  name: "Alice",
  updatedAt: "2026-06-23T12:30:00.000Z",
};
const bob: ParticipantSummary = {
  createdAt: "2026-06-23T12:35:00.000Z",
  eventId,
  id: "941e70aa-4981-4580-8f7d-0ff63f1d54ce",
  name: "Bob",
  updatedAt: "2026-06-23T12:35:00.000Z",
};
const loadedEvent: GetEventEntryPageResponse = {
  createdAt: "2026-06-23T12:00:00.000Z",
  id: eventId,
  name: "Noël 2026",
  participants: [alice, bob],
  updatedAt: "2026-06-23T12:00:00.000Z",
};

const clearSelectedParticipantId =
  vi.fn<SelectedParticipantStorage["clearSelectedParticipantId"]>();
const getParticipantWishes = vi.fn<WishRepository["getParticipantWishes"]>();
const createWish = vi.fn<WishRepository["createWish"]>();

@Component({ template: "Entry" })
class TestEntryPage {}

beforeEach(() => {
  clearSelectedParticipantId.mockReset();
  getParticipantWishes.mockReset();
  getParticipantWishes.mockReturnValue(of({ wishes: [] }));
  createWish.mockReset();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: "events/:eventId",
          component: EventHomePage,
          resolve: { [eventEntryRoute.dataKey]: () => loadedEvent },
        },
        { path: "events/:eventId/entry", component: TestEntryPage },
      ]),
      {
        provide: SelectedParticipantStorage,
        useValue: { clearSelectedParticipantId },
      },
      {
        provide: WishRepository,
        useValue: { createWish, getParticipantWishes },
      },
    ],
  });
});

describe("EventHomePage", () => {
  it("shows the Event name and selected Participant", async () => {
    TestBed.inject(SelectedParticipantContext).set({
      eventId,
      participantId: alice.id,
    });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl(`/events/${eventId}`, EventHomePage);

    expect(harness.routeNativeElement?.textContent).toContain("Noël 2026");
    expect(harness.routeNativeElement?.textContent).toContain("Alice");
    expect(harness.routeNativeElement?.textContent).toContain("Ma liste");
    expect(getParticipantWishes).toHaveBeenCalledWith(alice.id);
  });

  it("clears selection and navigates to entry when changing Participant", async () => {
    const context = TestBed.inject(SelectedParticipantContext);
    context.set({ eventId, participantId: alice.id });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/events/${eventId}`, EventHomePage);

    clickButtonWithText(harness.routeNativeElement, "Changer de participant");
    await harness.fixture.whenStable();

    expect(clearSelectedParticipantId).toHaveBeenCalledWith(eventId);
    expect(context.selection()).toBeNull();
    expect(TestBed.inject(Router).url).toBe(`/events/${eventId}/entry`);
  });

  it("clears stale selection and redirects to entry", async () => {
    const context = TestBed.inject(SelectedParticipantContext);
    context.set({
      eventId,
      participantId: "1d072aa9-9cfd-4122-a798-ed1dc3f4a96a",
    });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl(`/events/${eventId}`);
    await harness.fixture.whenStable();

    expect(clearSelectedParticipantId).toHaveBeenCalledWith(eventId);
    expect(context.selection()).toBeNull();
    expect(TestBed.inject(Router).url).toBe(`/events/${eventId}/entry`);
  });
});

function clickButtonWithText(
  element: HTMLElement | null,
  text: string,
): void {
  if (!element) throw new Error("Expected routed content.");
  const button = Array.from(element.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  if (!button) throw new Error(`Expected a button named ${text}.`);
  button.click();
}
