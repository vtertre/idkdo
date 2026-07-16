import { ComponentFixture, TestBed } from "@angular/core/testing";
import type {
  ParticipantSummary,
  ReservationSummary,
} from "@idkdo/shared";

import { ReservationCoordination } from "./reservation-coordination";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";
const alice = participant("3b8dc5a0-9dbc-4e14-99a7-750df7c86fbb", "Alice");
const bob = participant("941e70aa-4981-4580-8f7d-0ff63f1d54ce", "Bob");
const carol = participant("2084efff-63b5-4a2d-b5f5-b1a25067cc86", "Carol");
const dave = participant("4ca8b4d7-af86-4110-9fa0-5f3e0248c877", "Dave");

function reservationWith(participantIds: readonly string[]): ReservationSummary {
  return {
    contributors: participantIds.map((participantId, index) => ({
      createdAt: `2026-07-08T10:0${index}:00.000Z`,
      participantId,
    })),
    createdAt: "2026-07-08T10:00:00.000Z",
    id: "2ac83c83-bd5d-467f-9253-3640e00cc02d",
    updatedAt: "2026-07-08T10:00:00.000Z",
    wishId: "77dbbaf2-9115-47b5-b58d-5871ce25fc2d",
  };
}

describe("ReservationCoordination", () => {
  it("resolves contributor names and falls back to «Quelqu'un»", async () => {
    const { element } = await createComponent({
      reservation: reservationWith([bob.id, "unknown-participant-id"]),
      viewer: carol.id,
    });
    const names = Array.from(
      element.querySelectorAll<HTMLElement>(".contributor-name"),
    ).map((node) => node.textContent?.trim());

    expect(names).toEqual(["Bob", "Quelqu'un"]);
  });

  it("labels the viewer's own row «Ne plus participer» and others «Retirer»", async () => {
    const { element } = await createComponent({
      reservation: reservationWith([bob.id, carol.id]),
      viewer: carol.id,
    });
    const rows = Array.from(element.querySelectorAll<HTMLElement>(".contributor"));

    expect(rowText(rows[0], ".remove")).toBe("Retirer");
    expect(rowText(rows[1], ".remove")).toBe("Ne plus participer");
  });

  it("hides «Participer» when the viewer already contributes", async () => {
    const { element } = await createComponent({
      reservation: reservationWith([bob.id, carol.id]),
      viewer: carol.id,
    });

    expect(buttonWithText(element, "Participer")).toBeUndefined();
  });

  it("shows «Participer» when the viewer is not yet a contributor", async () => {
    const { element } = await createComponent({
      reservation: reservationWith([bob.id]),
      viewer: carol.id,
    });

    expect(buttonWithText(element, "Participer")).toBeDefined();
  });

  it("excludes the Wisher and existing contributors from the picker", async () => {
    const { element, fixture } = await createComponent({
      reservation: reservationWith([bob.id]),
      viewer: bob.id,
    });

    clickButton(element, "Ajouter quelqu'un");
    fixture.detectChanges();

    const options = optionValues(element);
    expect(options).not.toContain(alice.id);
    expect(options).not.toContain(bob.id);
    expect(options).toContain(carol.id);
    expect(options).toContain(dave.id);
  });

  it("hides the add picker when no eligible participants remain", async () => {
    const { element } = await createComponent({
      reservation: reservationWith([bob.id, carol.id, dave.id]),
      viewer: bob.id,
    });

    expect(buttonWithText(element, "Ajouter quelqu'un")).toBeUndefined();
    expect(element.querySelector(".picker")).toBeNull();
  });
});

describe("ReservationCoordination outputs", () => {
  it("emits addRequested with the selected id and closes the picker", async () => {
    const { component, element, fixture } = await createComponent({
      reservation: reservationWith([bob.id]),
      viewer: bob.id,
    });
    const added: string[] = [];
    component.addRequested.subscribe((id) => added.push(id));

    clickButton(element, "Ajouter quelqu'un");
    fixture.detectChanges();
    const select = element.querySelector<HTMLSelectElement>(".picker-select");
    if (!select) throw new Error("Expected the picker select.");
    select.value = dave.id;
    select.dispatchEvent(new Event("change"));
    fixture.detectChanges();
    clickButton(element, "Ajouter");
    fixture.detectChanges();

    expect(added).toEqual([dave.id]);
    expect(element.querySelector(".picker")).toBeNull();
  });

  it("emits joinRequested when «Participer» is selected", async () => {
    const { component, element } = await createComponent({
      reservation: reservationWith([bob.id]),
      viewer: carol.id,
    });
    let joined = 0;
    component.joinRequested.subscribe(() => (joined += 1));

    clickButton(element, "Participer");

    expect(joined).toBe(1);
  });

  it("emits removeRequested with the contributor id", async () => {
    const { component, element } = await createComponent({
      reservation: reservationWith([bob.id, carol.id]),
      viewer: carol.id,
    });
    const removed: string[] = [];
    component.removeRequested.subscribe((id) => removed.push(id));

    const rows = Array.from(element.querySelectorAll<HTMLElement>(".contributor"));
    rows[0]?.querySelector<HTMLButtonElement>(".remove")?.click();

    expect(removed).toEqual([bob.id]);
  });

  it("does not emit while busy", async () => {
    const { component, element } = await createComponent({
      reservation: reservationWith([bob.id]),
      viewer: carol.id,
      busy: true,
    });
    let joined = 0;
    component.joinRequested.subscribe(() => (joined += 1));

    buttonWithText(element, "Participer")?.click();

    expect(joined).toBe(0);
  });
});

async function createComponent(options: {
  readonly reservation: ReservationSummary;
  readonly viewer: string;
  readonly busy?: boolean;
}): Promise<{
  readonly component: ReservationCoordination;
  readonly element: HTMLElement;
  readonly fixture: ComponentFixture<ReservationCoordination>;
}> {
  TestBed.configureTestingModule({ imports: [ReservationCoordination] });
  const fixture = TestBed.createComponent(ReservationCoordination);
  fixture.componentRef.setInput("reservation", options.reservation);
  fixture.componentRef.setInput("viewerParticipantId", options.viewer);
  fixture.componentRef.setInput("participants", [alice, bob, carol, dave]);
  fixture.componentRef.setInput("wisherId", alice.id);
  fixture.componentRef.setInput("busy", options.busy ?? false);
  await fixture.whenStable();

  return {
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
    fixture,
  };
}

function participant(id: string, name: string): ParticipantSummary {
  return {
    createdAt: "2026-06-23T12:30:00.000Z",
    eventId,
    id,
    name,
    updatedAt: "2026-06-23T12:30:00.000Z",
  };
}

function optionValues(element: HTMLElement): readonly string[] {
  return Array.from(element.querySelectorAll<HTMLOptionElement>("option"))
    .map((option) => option.value)
    .filter((value) => value !== "");
}

function rowText(row: HTMLElement | undefined, selector: string): string {
  return row?.querySelector(selector)?.textContent?.trim() ?? "";
}

function buttonWithText(
  element: HTMLElement,
  text: string,
): HTMLButtonElement | undefined {
  return Array.from(element.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
}

function clickButton(element: HTMLElement, text: string): void {
  const button = buttonWithText(element, text);
  if (!button) throw new Error(`Expected a button named ${text}.`);
  button.click();
}
