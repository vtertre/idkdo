import { TestBed } from "@angular/core/testing";

import { SelectedParticipantContext } from "./selected-participant-context";

describe("SelectedParticipantContext", () => {
  it("stores and clears the selected Participant context", () => {
    TestBed.configureTestingModule({});
    const context = TestBed.inject(SelectedParticipantContext);
    const selection = {
      eventId: "4d8f4cb5-6188-420f-b2ec-12059c972793",
      participantId: "3b8dc5a0-9dbc-4e14-99a7-750df7c86fbb",
    };

    context.set(selection);

    expect(context.selection()).toEqual(selection);

    context.clear();

    expect(context.selection()).toBeNull();
  });
});
