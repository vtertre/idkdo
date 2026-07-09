import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";

import { SelectedParticipantContext } from "../../../core/identity/selected-participant-context";
import { selectedParticipantGuard } from "./selected-participant-guard";
import { SelectedParticipantStorage } from "./selected-participant-storage";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";
const participantId = "3b8dc5a0-9dbc-4e14-99a7-750df7c86fbb";

const getSelectedParticipantId =
  vi.fn<SelectedParticipantStorage["getSelectedParticipantId"]>();

@Component({ template: "Home" })
class TestHomePage {}

@Component({ template: "Entry" })
class TestEntryPage {}

describe("selectedParticipantGuard", () => {
  beforeEach(() => {
    getSelectedParticipantId.mockReset();
    getSelectedParticipantId.mockReturnValue(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: "events/:eventId",
            component: TestHomePage,
            canActivate: [selectedParticipantGuard],
          },
          { path: "events/:eventId/entry", component: TestEntryPage },
        ]),
        {
          provide: SelectedParticipantStorage,
          useValue: { getSelectedParticipantId },
        },
      ],
    });
  });

  it("redirects to entry when no Participant is stored", async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl(`/events/${eventId}`);

    expect(TestBed.inject(Router).url).toBe(`/events/${eventId}/entry`);
    expect(harness.routeNativeElement?.textContent).toContain("Entry");
    expect(TestBed.inject(SelectedParticipantContext).selection()).toBeNull();
  });

  it("allows activation and sets context when a Participant is stored", async () => {
    getSelectedParticipantId.mockReturnValue(participantId);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl(`/events/${eventId}`);

    expect(TestBed.inject(Router).url).toBe(`/events/${eventId}`);
    expect(harness.routeNativeElement?.textContent).toContain("Home");
    expect(TestBed.inject(SelectedParticipantContext).selection()).toEqual({
      eventId,
      participantId,
    });
  });
});
