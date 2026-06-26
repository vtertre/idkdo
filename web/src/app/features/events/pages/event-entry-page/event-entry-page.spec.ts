import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import type {
  CreateParticipantResponse,
  GetEventEntryPageResponse,
  ParticipantSummary,
} from "@idkdo/shared";
import type { WritableSignal } from "@angular/core";
import { Subject, defer, of, throwError } from "rxjs";

import { eventEntryRoute } from "../../data-access/event-entry-route";
import { EventRepositoryError } from "../../data-access/event-repository-error";
import { EventRepository } from "../../data-access/event-repository";
import { SelectedParticipantStorage } from "../../data-access/selected-participant-storage";
import { EventEntryPage } from "./event-entry-page";
import { EventUnavailablePage } from "../event-unavailable-page/event-unavailable-page";

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
const charlie: ParticipantSummary = {
  createdAt: "2026-06-23T12:40:00.000Z",
  eventId,
  id: "5f9af7c8-e7a9-487e-961d-48ca3462d82d",
  name: "Charlie",
  updatedAt: "2026-06-23T12:40:00.000Z",
};
const loadedEvent: GetEventEntryPageResponse = {
  createdAt: "2026-06-23T12:00:00.000Z",
  id: eventId,
  name: "Noël 2026",
  participants: [],
  updatedAt: "2026-06-23T12:00:00.000Z",
};
const loadedEventWithParticipants: GetEventEntryPageResponse = {
  ...loadedEvent,
  participants: [alice, bob],
};

const getEvent = vi.fn<EventRepository["getEvent"]>();
const createParticipant = vi.fn<EventRepository["createParticipant"]>();
const getSelectedParticipantId =
  vi.fn<SelectedParticipantStorage["getSelectedParticipantId"]>();
const setSelectedParticipantId =
  vi.fn<SelectedParticipantStorage["setSelectedParticipantId"]>();
const clearSelectedParticipantId =
  vi.fn<SelectedParticipantStorage["clearSelectedParticipantId"]>();

beforeEach(() => {
  resetDoubles();
  configureEventEntryPageTest();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EventEntryPage rendering", () => {
  it("resolves the route Event and renders the entry form with its share link", async () => {
    const { element, page } = await navigateToEvent(loadedEvent);

    expect(page).toBeInstanceOf(EventEntryPage);
    expect(getEvent).toHaveBeenCalledWith(eventId);
    expect(element.textContent).toContain("Noël 2026");
    expect(element.textContent).toContain("Ajouter votre nom");
    expect(element.querySelector("#participant-name")).not.toBeNull();
    const link = element.querySelector<HTMLAnchorElement>(".share a");
    expect(link?.href).toBe(`${window.location.origin}/events/${eventId}`);
  });

  it("injects the resolved Event as a writable signal", async () => {
    const { element, harness, page } = await navigateToEvent(loadedEvent);
    const eventSignal = getEventSignal(page);

    eventSignal.set({ ...loadedEvent, name: "Anniversaire d’Alice" });
    harness.detectChanges();

    expect(element.textContent).toContain("Anniversaire d’Alice");
  });
});

describe("EventEntryPage participant identity", () => {
  it("renders existing Participants and stores the selected id", async () => {
    const { element, harness } = await navigateToEvent(loadedEventWithParticipants);

    clickButtonWithText(element, "Alice");
    harness.detectChanges();

    expect(setSelectedParticipantId).toHaveBeenCalledWith(eventId, alice.id);
    expect(element.textContent).toContain("Identité choisie");
    expect(element.textContent).toContain("Alice");
  });

  it("stores the returned Participant id after creating one", async () => {
    const request = new Subject<CreateParticipantResponse>();
    createParticipant.mockReturnValue(request.asObservable());
    const { element, harness } = await navigateToEvent(loadedEvent);

    setParticipantName(element, "Alice");
    submitParticipantForm(element);
    submitParticipantForm(element);
    harness.detectChanges();

    expect(createParticipant).toHaveBeenCalledOnce();
    expect(createParticipant).toHaveBeenCalledWith(eventId, "Alice");
    expect(
      element.querySelector<HTMLButtonElement>("button[type='submit']")?.disabled,
    ).toBe(true);

    request.next(alice);
    request.complete();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(setSelectedParticipantId).toHaveBeenCalledWith(eventId, alice.id);
    expect(element.textContent).toContain("Identité choisie");
    expect(element.textContent).toContain("Alice");
  });

  it("restores a valid selected Participant after refresh", async () => {
    getSelectedParticipantId.mockReturnValue(alice.id);

    const { element } = await navigateToEvent(loadedEventWithParticipants);

    expect(element.textContent).toContain("Identité choisie");
    expect(element.textContent).toContain("Alice");
  });

  it("keeps a stored Participant id that is missing from the current projection", async () => {
    getSelectedParticipantId.mockReturnValue("1d072aa9-9cfd-4122-a798-ed1dc3f4a96a");

    const { element } = await navigateToEvent(loadedEventWithParticipants);

    expect(clearSelectedParticipantId).not.toHaveBeenCalled();
    expect(element.textContent).toContain("Ajouter votre nom");
  });

  it("clears the stored Participant id when changing participant", async () => {
    getSelectedParticipantId.mockReturnValue(alice.id);

    const { element, harness } = await navigateToEvent(loadedEventWithParticipants);

    clickButtonWithText(element, "Changer de participant");
    harness.detectChanges();

    expect(clearSelectedParticipantId).toHaveBeenCalledWith(eventId);
    expect(element.textContent).toContain("Ajouter votre nom");
  });

  it("does not let a pending create overwrite a later Participant selection", async () => {
    const request = new Subject<CreateParticipantResponse>();
    createParticipant.mockReturnValue(request.asObservable());
    const { element, harness, page } = await navigateToEvent(loadedEventWithParticipants);

    setParticipantName(element, "Charlie");
    submitParticipantForm(element);
    harness.detectChanges();

    expect(getParticipantButton(element, "Alice")?.disabled).toBe(true);
    selectParticipantInComponent(page, bob);
    harness.detectChanges();

    request.next(charlie);
    request.complete();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(setSelectedParticipantId).toHaveBeenLastCalledWith(eventId, bob.id);
    expect(element.textContent).toContain("Identité choisie");
    expect(element.textContent).toContain("Bob");
  });
});

describe("EventEntryPage create errors", () => {
  it("shows a duplicate-name error without clearing input", async () => {
    createParticipant.mockReturnValue(
      throwError(
        () =>
          new EventRepositoryError(
            "A participant with that name already exists.",
            409,
            "PARTICIPANT_NAME_ALREADY_EXISTS",
          ),
      ),
    );
    const { element, harness } = await navigateToEvent(loadedEvent);

    setParticipantName(element, "Alice");
    submitParticipantForm(element);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(element.textContent).toContain(
      "Ce participant existe déjà pour cet événement.",
    );
    expect(element.querySelector<HTMLInputElement>("#participant-name")?.value).toBe(
      "Alice",
    );
  });

  it("shows a generic create failure", async () => {
    createParticipant.mockReturnValue(
      throwError(
        () =>
          new EventRepositoryError("Server unavailable.", 500, "SERVER_ERROR"),
      ),
    );
    const { element, harness } = await navigateToEvent(loadedEvent);

    setParticipantName(element, "Alice");
    submitParticipantForm(element);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(element.textContent).toContain(
      "Le participant n’a pas pu être créé. Réessayez.",
    );
  });

  it("retries Participant creation with the same name after a failure", async () => {
    createParticipant
      .mockReturnValueOnce(
        throwError(
          () =>
            new EventRepositoryError("Server unavailable.", 500, "SERVER_ERROR"),
        ),
      )
      .mockReturnValueOnce(of(alice));
    const { element, harness } = await navigateToEvent(loadedEvent);

    setParticipantName(element, "Alice");
    submitParticipantForm(element);
    await harness.fixture.whenStable();
    harness.detectChanges();
    submitParticipantForm(element);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(createParticipant).toHaveBeenCalledTimes(2);
    expect(setSelectedParticipantId).toHaveBeenCalledWith(eventId, alice.id);
    expect(element.textContent).toContain("Identité choisie");
    expect(element.textContent).toContain("Alice");
  });
});

describe("EventEntryPage resolver", () => {
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

function resetDoubles(): void {
  getEvent.mockReset();
  createParticipant.mockReset();
  createParticipant.mockReturnValue(of(alice));
  getSelectedParticipantId.mockReset();
  getSelectedParticipantId.mockReturnValue(null);
  setSelectedParticipantId.mockReset();
  clearSelectedParticipantId.mockReset();
}

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
      { provide: EventRepository, useValue: { createParticipant, getEvent } },
      {
        provide: SelectedParticipantStorage,
        useValue: {
          clearSelectedParticipantId,
          getSelectedParticipantId,
          setSelectedParticipantId,
        },
      },
    ],
  });
}

async function navigateToEvent(event: GetEventEntryPageResponse): Promise<{
  element: HTMLElement;
  harness: RouterTestingHarness;
  page: EventEntryPage;
}> {
  getEvent.mockReturnValue(of(event));
  const harness = await RouterTestingHarness.create();
  const page = await harness.navigateByUrl(
    `/events/${eventId}`,
    EventEntryPage,
  );
  harness.detectChanges();

  if (!harness.routeNativeElement) {
    throw new Error("Expected the Event entry route to render.");
  }

  return { element: harness.routeNativeElement, harness, page };
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

function setParticipantName(element: HTMLElement, name: string): void {
  const input = element.querySelector<HTMLInputElement>("#participant-name");
  if (!input) throw new Error("Expected the Participant name input.");
  input.value = name;
  input.dispatchEvent(new Event("input"));
}

function submitParticipantForm(element: HTMLElement): void {
  const form = element.querySelector<HTMLFormElement>(".create-participant");
  if (!form) throw new Error("Expected the Participant creation form.");
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
}

function clickButtonWithText(element: HTMLElement, text: string): void {
  const button = getParticipantButton(element, text);
  if (!button) throw new Error(`Expected a button named ${text}.`);
  button.click();
}

function getParticipantButton(
  element: HTMLElement,
  text: string,
): HTMLButtonElement | undefined {
  return Array.from(element.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
}

function selectParticipantInComponent(
  page: EventEntryPage,
  participant: ParticipantSummary,
): void {
  (
    page as unknown as {
      selectParticipant(participant: ParticipantSummary): void;
    }
  ).selectParticipant(participant);
}
