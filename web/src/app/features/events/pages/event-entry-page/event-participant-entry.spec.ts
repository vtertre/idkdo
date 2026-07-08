import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import type {
  GetEventEntryPageResponse,
  ParticipantSummary,
} from "@idkdo/shared";
import { of } from "rxjs";

import { SelectedParticipantContext } from "../../../../core/identity/selected-participant-context";
import { EventRepository } from "../../data-access/event-repository";
import { SelectedParticipantStorage } from "../../data-access/selected-participant-storage";
import { EventParticipantEntry } from "./event-participant-entry";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";
const alice: ParticipantSummary = {
  createdAt: "2026-06-23T12:30:00.000Z",
  eventId,
  id: "3b8dc5a0-9dbc-4e14-99a7-750df7c86fbb",
  name: "Alice",
  updatedAt: "2026-06-23T12:30:00.000Z",
};
const loadedEvent: GetEventEntryPageResponse = {
  createdAt: "2026-06-23T12:00:00.000Z",
  id: eventId,
  name: "Noël 2026",
  participants: [alice],
  updatedAt: "2026-06-23T12:00:00.000Z",
};

const createParticipant = vi.fn<EventRepository["createParticipant"]>();
const getSelectedParticipantId =
  vi.fn<SelectedParticipantStorage["getSelectedParticipantId"]>();
const setSelectedParticipantId =
  vi.fn<SelectedParticipantStorage["setSelectedParticipantId"]>();
const clearSelectedParticipantId =
  vi.fn<SelectedParticipantStorage["clearSelectedParticipantId"]>();
const navigate = vi.fn<Router["navigate"]>();

beforeEach(() => {
  createParticipant.mockReset();
  createParticipant.mockReturnValue(of(alice));
  getSelectedParticipantId.mockReset();
  getSelectedParticipantId.mockReturnValue(null);
  setSelectedParticipantId.mockReset();
  clearSelectedParticipantId.mockReset();
  navigate.mockReset();
  navigate.mockResolvedValue(true);
  TestBed.configureTestingModule({
    imports: [EventParticipantEntry],
    providers: [
      { provide: EventRepository, useValue: { createParticipant } },
      {
        provide: SelectedParticipantStorage,
        useValue: {
          clearSelectedParticipantId,
          getSelectedParticipantId,
          setSelectedParticipantId,
        },
      },
      { provide: Router, useValue: { navigate } },
    ],
  });
});

describe("EventParticipantEntry", () => {
  it("selects an existing Participant and navigates to the main Event route", async () => {
    const { element } = await createEntry(loadedEvent);

    clickButtonWithText(element, "Alice");

    expect(setSelectedParticipantId).toHaveBeenCalledWith(eventId, alice.id);
    expect(TestBed.inject(SelectedParticipantContext).selection()).toEqual({
      eventId,
      participantId: alice.id,
    });
    expect(navigate).toHaveBeenCalledWith(["/events", eventId]);
  });

  it("creates, selects, and navigates with the returned Participant", async () => {
    const { element, fixture } = await createEntry({
      ...loadedEvent,
      participants: [],
    });

    setParticipantName(element, "Alice");
    submitParticipantForm(element);
    await fixture.whenStable();

    expect(createParticipant).toHaveBeenCalledWith(eventId, "Alice");
    expect(setSelectedParticipantId).toHaveBeenCalledWith(eventId, alice.id);
    expect(navigate).toHaveBeenCalledWith(["/events", eventId]);
  });

  it("clears storage and context when changing Participant", async () => {
    getSelectedParticipantId.mockReturnValue(alice.id);
    const context = TestBed.inject(SelectedParticipantContext);
    context.set({ eventId, participantId: alice.id });
    const { element } = await createEntry(loadedEvent);

    clickButtonWithText(element, "Changer de participant");

    expect(clearSelectedParticipantId).toHaveBeenCalledWith(eventId);
    expect(context.selection()).toBeNull();
  });
});

async function createEntry(eventEntry: GetEventEntryPageResponse): Promise<{
  readonly element: HTMLElement;
  readonly fixture: ComponentFixture<EventParticipantEntry>;
}> {
  const fixture = TestBed.createComponent(EventParticipantEntry);
  fixture.componentRef.setInput("eventEntry", eventEntry);
  await fixture.whenStable();

  return { element: fixture.nativeElement as HTMLElement, fixture };
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
  const button = Array.from(element.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  if (!button) throw new Error(`Expected a button named ${text}.`);
  button.click();
}
