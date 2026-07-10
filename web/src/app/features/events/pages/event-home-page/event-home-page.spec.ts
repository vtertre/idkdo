import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { Router, provideRouter } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import type { GetEventEntryPageResponse, ParticipantSummary } from "@idkdo/shared";
import { of } from "rxjs";

import { SelectedParticipantContext } from "../../../../core/identity/selected-participant-context";
import { EventWishesPanel } from "../../../wishes/components/event-wishes-panel/event-wishes-panel";
import { WishlistPanel } from "../../../wishes/components/wishlist-panel/wishlist-panel";
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
const getEventWishes = vi.fn<WishRepository["getEventWishes"]>();
const createWish = vi.fn<WishRepository["createWish"]>();

@Component({ template: "Entry" })
class TestEntryPage {}

beforeEach(() => {
  clearSelectedParticipantId.mockReset();
  getParticipantWishes.mockReset();
  getParticipantWishes.mockReturnValue(of({ wishes: [] }));
  getEventWishes.mockReset();
  getEventWishes.mockReturnValue(of({ wishes: [] }));
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
        useValue: { createWish, getEventWishes, getParticipantWishes },
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
    expect(getEventWishes).toHaveBeenCalledWith(eventId);
  });

  it("switches the active mobile tab while keeping both panels mounted", async () => {
    TestBed.inject(SelectedParticipantContext).set({
      eventId,
      participantId: alice.id,
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/events/${eventId}`, EventHomePage);
    const element = harness.routeNativeElement;
    if (!element) throw new Error("Expected routed content.");

    const myListTab = buttonWithText(element, "Ma liste");
    const eventWishesTab = buttonWithText(element, "Toutes les listes");

    expect(myListTab.getAttribute("aria-selected")).toBe("true");
    expect(eventWishesTab.getAttribute("aria-selected")).toBe("false");
    expect(element.querySelector(".my-list-panel")?.classList).toContain(
      "is-active",
    );
    expect(element.querySelector(".event-wishes-panel")?.classList).not.toContain(
      "is-active",
    );
    expect(element.querySelector("app-wishlist-panel")).not.toBeNull();
    expect(element.querySelector("app-event-wishes-panel")).not.toBeNull();

    eventWishesTab.click();
    await harness.fixture.whenStable();

    expect(myListTab.getAttribute("aria-selected")).toBe("false");
    expect(eventWishesTab.getAttribute("aria-selected")).toBe("true");
    expect(element.querySelector(".my-list-panel")?.classList).not.toContain(
      "is-active",
    );
    expect(element.querySelector(".event-wishes-panel")?.classList).toContain(
      "is-active",
    );
  });

  it("passes Event, viewer, and Participant inputs to both panels", async () => {
    TestBed.inject(SelectedParticipantContext).set({
      eventId,
      participantId: alice.id,
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/events/${eventId}`, EventHomePage);

    const wishlistPanel = harness.fixture.debugElement.query(
      By.directive(WishlistPanel),
    ).componentInstance as WishlistPanel;
    const eventWishesPanel = harness.fixture.debugElement.query(
      By.directive(EventWishesPanel),
    ).componentInstance as EventWishesPanel;

    expect(wishlistPanel.participantId()).toBe(alice.id);
    expect(eventWishesPanel.eventId()).toBe(eventId);
    expect(eventWishesPanel.viewerParticipantId()).toBe(alice.id);
    expect(eventWishesPanel.participants()).toEqual([alice, bob]);
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

function buttonWithText(element: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(element.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  if (!button) throw new Error(`Expected a button named ${text}.`);

  return button;
}
