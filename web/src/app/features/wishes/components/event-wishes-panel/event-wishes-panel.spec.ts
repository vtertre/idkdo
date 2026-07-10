import { ComponentFixture, TestBed } from "@angular/core/testing";
import type { EventWish, ParticipantSummary } from "@idkdo/shared";
import { of, throwError } from "rxjs";

import { WishRepositoryError } from "../../data-access/wish-repository-error";
import { WishRepository } from "../../data-access/wish-repository";
import { EventWishesPanel } from "./event-wishes-panel";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";
const alice = participant(
  "3b8dc5a0-9dbc-4e14-99a7-750df7c86fbb",
  "Alice",
);
const bob = participant("941e70aa-4981-4580-8f7d-0ff63f1d54ce", "Bob");
const chloe = participant("2084efff-63b5-4a2d-b5f5-b1a25067cc86", "Chloé");
const aliceWish: EventWish = {
  content: "Livre\nhttps://example.com/livre",
  createdAt: "2026-07-08T10:00:00.000Z",
  eventId,
  id: "77dbbaf2-9115-47b5-b58d-5871ce25fc2d",
  purchaseCoordination: { kind: "hidden" },
  updatedAt: "2026-07-08T10:00:00.000Z",
  wisherId: alice.id,
};
const bobWish: EventWish = {
  ...aliceWish,
  content: "Chocolat",
  id: "3909642a-8794-48dc-8815-1ff79dca34bb",
  purchaseCoordination: { kind: "visible", reservation: null },
  wisherId: bob.id,
};

const getEventWishes = vi.fn<WishRepository["getEventWishes"]>();

beforeEach(() => {
  getEventWishes.mockReset();
  getEventWishes.mockReturnValue(of({ wishes: [] }));
  TestBed.configureTestingModule({
    imports: [EventWishesPanel],
    providers: [
      {
        provide: WishRepository,
        useValue: { getEventWishes },
      },
    ],
  });
});

describe("EventWishesPanel", () => {
  it("renders groups in Participant order with names, empty state, and own badge", async () => {
    getEventWishes.mockReturnValue(of({ wishes: [bobWish, aliceWish] }));

    const { element } = await createPanel();
    const groups = Array.from(element.querySelectorAll<HTMLElement>(".wish-group"));

    expect(getEventWishes).toHaveBeenCalledWith(eventId);
    expect(groups.map((group) => group.querySelector("h3")?.textContent?.trim())).toEqual([
      "Alice vous",
      "Bob",
      "Chloé",
    ]);
    expect(groups[2]?.textContent).toContain("Aucun souhait pour le moment");
    expect(groups[0]?.querySelector(".viewer-badge")?.textContent).toContain(
      "vous",
    );
  });

  it("omits coordination entirely for own Wishes and renders an empty container for visible-null Wishes", async () => {
    getEventWishes.mockReturnValue(of({ wishes: [aliceWish, bobWish] }));

    const { element } = await createPanel();
    const aliceGroup = groupFor(element, alice.id);
    const bobCoordination = groupFor(element, bob.id).querySelector(
      ".purchase-coordination",
    );

    expect(aliceGroup.querySelector(".purchase-coordination")).toBeNull();
    expect(bobCoordination).not.toBeNull();
    expect(bobCoordination?.textContent?.trim()).toBe("");
  });

  it("shows a load error and retries successfully", async () => {
    getEventWishes
      .mockReturnValueOnce(
        throwError(() => new WishRepositoryError("Failure.", 500, "FAILURE")),
      )
      .mockReturnValueOnce(of({ wishes: [aliceWish] }));
    const { element, fixture } = await createPanel();

    expect(element.textContent).toContain(
      "Les listes n’ont pas pu être chargées. Réessayez.",
    );

    clickButtonWithText(element, "Réessayer");
    await fixture.whenStable();

    expect(getEventWishes).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain("Livre");
  });

  it("refreshes when Actualiser is selected", async () => {
    getEventWishes
      .mockReturnValueOnce(of({ wishes: [] }))
      .mockReturnValueOnce(of({ wishes: [bobWish] }));
    const { element, fixture } = await createPanel();

    clickButtonWithText(element, "Actualiser");
    await fixture.whenStable();

    expect(getEventWishes).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain("Chocolat");
  });

  it("renders hostile Wish content as inert text", async () => {
    getEventWishes.mockReturnValue(
      of({
        wishes: [
          {
            ...aliceWish,
            content: "<b>gras</b>\n<script>alert(1)</script>",
          },
        ],
      }),
    );

    const { element } = await createPanel();

    expect(element.textContent).toContain("<b>gras</b>");
    expect(element.textContent).toContain("<script>alert(1)</script>");
    expect(element.querySelector("b")).toBeNull();
    expect(element.querySelector("script")).toBeNull();
  });

  it("appends stale unknown Wishers under a neutral group", async () => {
    const unknownWisherId = "4ca8b4d7-af86-4110-9fa0-5f3e0248c877";
    getEventWishes.mockReturnValue(
      of({
        wishes: [
          {
            ...bobWish,
            id: "890c416c-1636-4fdd-88cb-1c4acc796a0b",
            wisherId: unknownWisherId,
          },
        ],
      }),
    );

    const { element } = await createPanel();
    const groups = Array.from(element.querySelectorAll<HTMLElement>(".wish-group"));

    expect(groups).toHaveLength(4);
    expect(groups.at(-1)?.dataset["wisherId"]).toBe(unknownWisherId);
    expect(groups.at(-1)?.querySelector("h3")?.textContent).toContain(
      "Participant inconnu",
    );
  });
});

async function createPanel(): Promise<{
  readonly element: HTMLElement;
  readonly fixture: ComponentFixture<EventWishesPanel>;
}> {
  const fixture = TestBed.createComponent(EventWishesPanel);
  fixture.componentRef.setInput("eventId", eventId);
  fixture.componentRef.setInput("viewerParticipantId", alice.id);
  fixture.componentRef.setInput("participants", [alice, bob, chloe]);
  await fixture.whenStable();

  return { element: fixture.nativeElement as HTMLElement, fixture };
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

function groupFor(element: HTMLElement, wisherId: string): HTMLElement {
  const group = element.querySelector<HTMLElement>(
    `[data-wisher-id="${wisherId}"]`,
  );
  if (!group) throw new Error(`Expected a group for ${wisherId}.`);

  return group;
}

function clickButtonWithText(element: HTMLElement, text: string): void {
  const button = Array.from(element.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  if (!button) throw new Error(`Expected a button named ${text}.`);
  button.click();
}
