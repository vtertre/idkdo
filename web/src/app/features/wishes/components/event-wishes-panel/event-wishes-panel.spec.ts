import { ComponentFixture, TestBed } from "@angular/core/testing";
import type { EventWish, ParticipantSummary } from "@idkdo/shared";
import { of, throwError } from "rxjs";

import { WishRepositoryError } from "../../data-access/wish-repository-error";
import { ReservationRepository } from "../../data-access/reservation-repository";
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
const reservation = {
  contributors: [
    {
      createdAt: "2026-07-08T10:01:00.000Z",
      participantId: alice.id,
    },
  ],
  createdAt: "2026-07-08T10:01:00.000Z",
  id: "2ac83c83-bd5d-467f-9253-3640e00cc02d",
  updatedAt: "2026-07-08T10:01:00.000Z",
  wishId: bobWish.id,
};

const getEventWishes = vi.fn<WishRepository["getEventWishes"]>();
const createReservation = vi.fn<ReservationRepository["createReservation"]>();
const addContributor = vi.fn<ReservationRepository["addContributor"]>();
const removeContributor = vi.fn<ReservationRepository["removeContributor"]>();

const reservedBobWish: EventWish = {
  ...bobWish,
  purchaseCoordination: { kind: "visible", reservation },
};

beforeEach(() => {
  getEventWishes.mockReset();
  getEventWishes.mockReturnValue(of({ wishes: [] }));
  createReservation.mockReset();
  createReservation.mockReturnValue(of(reservation));
  addContributor.mockReset();
  addContributor.mockReturnValue(of(reservation));
  removeContributor.mockReset();
  removeContributor.mockReturnValue(of({ reservation }));
  TestBed.configureTestingModule({
    imports: [EventWishesPanel],
    providers: [
      {
        provide: WishRepository,
        useValue: { getEventWishes },
      },
      {
        provide: ReservationRepository,
        useValue: { createReservation, addContributor, removeContributor },
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

  it("renders Réserver only for visible unreserved Wishes and omits coordination for own Wishes", async () => {
    getEventWishes.mockReturnValue(of({ wishes: [aliceWish, bobWish] }));

    const { element } = await createPanel();
    const aliceGroup = groupFor(element, alice.id);
    const bobCoordination = groupFor(element, bob.id).querySelector(
      ".purchase-coordination",
    );

    expect(aliceGroup.querySelector(".purchase-coordination")).toBeNull();
    expect(bobCoordination).not.toBeNull();
    expect(bobCoordination?.textContent).toContain("Réserver");
    expect(aliceGroup.textContent).not.toContain("Réserver");
  });
});

describe("EventWishesPanel reservation coordination", () => {
  it("patches a successfully reserved Wish locally", async () => {
    getEventWishes.mockReturnValue(of({ wishes: [aliceWish, bobWish] }));
    const { element, fixture } = await createPanel();

    clickButtonWithText(element, "Réserver");
    await fixture.whenStable();

    expect(createReservation).toHaveBeenCalledWith(bobWish.id);
    expect(contributorNames(groupFor(element, bob.id))).toEqual(["Alice"]);
    expect(groupFor(element, bob.id).textContent).not.toContain("Réserver");
  });

  it("resolves contributor names and tolerates unknown Participants", async () => {
    getEventWishes.mockReturnValue(
      of({
        wishes: [
          {
            ...bobWish,
            purchaseCoordination: {
              kind: "visible",
              reservation: {
                ...reservation,
                contributors: [
                  reservation.contributors[0]!,
                  {
                    createdAt: "2026-07-08T10:02:00.000Z",
                    participantId: "4ca8b4d7-af86-4110-9fa0-5f3e0248c877",
                  },
                ],
              },
            },
          },
        ],
      }),
    );

    const { element } = await createPanel();

    expect(contributorNames(groupFor(element, bob.id))).toEqual([
      "Alice",
      "Quelqu'un",
    ]);
    expect(element.textContent).not.toContain("Réserver");
  });

  it("shows the conflict message and refreshes", async () => {
    getEventWishes.mockReturnValue(of({ wishes: [bobWish] }));
    createReservation.mockReturnValue(
      throwError(
        () =>
          new WishRepositoryError(
            "This wish is already reserved.",
            409,
            "RESERVATION_ALREADY_EXISTS",
          ),
      ),
    );
    const { element, fixture } = await createPanel();

    clickButtonWithText(element, "Réserver");
    await fixture.whenStable();

    expect(element.textContent).toContain(
      "Ce souhait vient d'être réservé par quelqu'un d'autre.",
    );
    expect(getEventWishes).toHaveBeenCalledTimes(2);
  });

  it("shows a generic reservation failure", async () => {
    getEventWishes.mockReturnValue(of({ wishes: [bobWish] }));
    createReservation.mockReturnValue(
      throwError(() => new WishRepositoryError("Failure.", 500, "FAILURE")),
    );
    const { element, fixture } = await createPanel();

    clickButtonWithText(element, "Réserver");
    await fixture.whenStable();

    expect(element.textContent).toContain("La réservation a échoué. Réessayez.");
    expect(getEventWishes).toHaveBeenCalledOnce();
  });
});

describe("EventWishesPanel contributor management", () => {
  it("patches the reservation from a join response", async () => {
    getEventWishes.mockReturnValue(of({ wishes: [reservedBobWish] }));
    addContributor.mockReturnValue(
      of({
        ...reservation,
        contributors: [
          reservation.contributors[0]!,
          { createdAt: "2026-07-08T10:02:00.000Z", participantId: chloe.id },
        ],
      }),
    );
    const { element, fixture } = await createPanel(chloe.id);

    clickButtonWithText(element, "Participer");
    await fixture.whenStable();

    expect(addContributor).toHaveBeenCalledWith(reservation.id, chloe.id);
    expect(contributorNames(groupFor(element, bob.id))).toEqual([
      "Alice",
      "Chloé",
    ]);
  });

  it("patches the reservation from an add response", async () => {
    getEventWishes.mockReturnValue(of({ wishes: [reservedBobWish] }));
    addContributor.mockReturnValue(
      of({
        ...reservation,
        contributors: [
          reservation.contributors[0]!,
          { createdAt: "2026-07-08T10:02:00.000Z", participantId: chloe.id },
        ],
      }),
    );
    const { element, fixture } = await createPanel();

    clickButtonWithText(element, "Ajouter quelqu'un");
    fixture.detectChanges();
    const select = groupFor(element, bob.id).querySelector<HTMLSelectElement>(
      ".picker-select",
    );
    if (!select) throw new Error("Expected the picker select.");
    select.value = chloe.id;
    select.dispatchEvent(new Event("change"));
    fixture.detectChanges();
    clickButtonWithText(element, "Ajouter");
    await fixture.whenStable();

    expect(addContributor).toHaveBeenCalledWith(reservation.id, chloe.id);
    expect(contributorNames(groupFor(element, bob.id))).toEqual([
      "Alice",
      "Chloé",
    ]);
  });

  it("patches the reservation from a remove response", async () => {
    getEventWishes.mockReturnValue(
      of({
        wishes: [
          {
            ...bobWish,
            purchaseCoordination: {
              kind: "visible",
              reservation: {
                ...reservation,
                contributors: [
                  reservation.contributors[0]!,
                  {
                    createdAt: "2026-07-08T10:02:00.000Z",
                    participantId: chloe.id,
                  },
                ],
              },
            },
          },
        ],
      }),
    );
    removeContributor.mockReturnValue(of({ reservation }));
    const { element, fixture } = await createPanel();

    const chloeRow = Array.from(
      groupFor(element, bob.id).querySelectorAll<HTMLElement>(".contributor"),
    ).find((row) => row.textContent?.includes("Chloé"));
    chloeRow?.querySelector<HTMLButtonElement>(".remove")?.click();
    await fixture.whenStable();

    expect(removeContributor).toHaveBeenCalledWith(reservation.id, chloe.id);
    expect(contributorNames(groupFor(element, bob.id))).toEqual(["Alice"]);
  });

  it("flips the wish back to Réserver when remove returns null", async () => {
    getEventWishes.mockReturnValue(of({ wishes: [reservedBobWish] }));
    removeContributor.mockReturnValue(of({ reservation: null }));
    const { element, fixture } = await createPanel();

    groupFor(element, bob.id)
      .querySelector<HTMLButtonElement>(".remove")
      ?.click();
    await fixture.whenStable();

    expect(removeContributor).toHaveBeenCalledWith(reservation.id, alice.id);
    expect(groupFor(element, bob.id).textContent).toContain("Réserver");
    expect(contributorNames(groupFor(element, bob.id))).toEqual([]);
  });

});

describe("EventWishesPanel contributor management errors", () => {
  it("shows the duplicate message and refreshes on 409", async () => {
    getEventWishes.mockReturnValue(of({ wishes: [reservedBobWish] }));
    addContributor.mockReturnValue(
      throwError(
        () =>
          new WishRepositoryError(
            "This participant already contributes to the reservation.",
            409,
            "CONTRIBUTOR_ALREADY_EXISTS",
          ),
      ),
    );
    const { element, fixture } = await createPanel(chloe.id);

    clickButtonWithText(element, "Participer");
    await fixture.whenStable();

    expect(element.textContent).toContain("Cette personne participe déjà.");
    expect(getEventWishes).toHaveBeenCalledTimes(2);
  });

  it("shows the gone message and refreshes on 404", async () => {
    getEventWishes.mockReturnValue(of({ wishes: [reservedBobWish] }));
    addContributor.mockReturnValue(
      throwError(
        () => new WishRepositoryError("Resource not found.", 404, "RESOURCE_NOT_FOUND"),
      ),
    );
    const { element, fixture } = await createPanel(chloe.id);

    clickButtonWithText(element, "Participer");
    await fixture.whenStable();

    expect(element.textContent).toContain("Cette réservation n'existe plus.");
    expect(getEventWishes).toHaveBeenCalledTimes(2);
  });
});

describe("EventWishesPanel own reserved Wishes", () => {
  it("renders no coordination UI for own reserved Wishes", async () => {
    const ownReservedWish: EventWish = {
      ...aliceWish,
      purchaseCoordination: { kind: "hidden" },
    };
    getEventWishes.mockReturnValue(of({ wishes: [ownReservedWish] }));

    const { element } = await createPanel();
    const aliceGroup = groupFor(element, alice.id);

    expect(aliceGroup.querySelector(".purchase-coordination")).toBeNull();
    expect(
      aliceGroup.querySelector("app-reservation-coordination"),
    ).toBeNull();
    expect(aliceGroup.textContent).not.toContain("Participer");
    expect(aliceGroup.textContent).not.toContain("Réserver");
  });
});

describe("EventWishesPanel loading and rendering", () => {
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

async function createPanel(
  viewerId: string = alice.id,
): Promise<{
  readonly element: HTMLElement;
  readonly fixture: ComponentFixture<EventWishesPanel>;
}> {
  const fixture = TestBed.createComponent(EventWishesPanel);
  fixture.componentRef.setInput("eventId", eventId);
  fixture.componentRef.setInput("viewerParticipantId", viewerId);
  fixture.componentRef.setInput("participants", [alice, bob, chloe]);
  await fixture.whenStable();

  return { element: fixture.nativeElement as HTMLElement, fixture };
}

function contributorNames(group: HTMLElement): readonly string[] {
  return Array.from(
    group.querySelectorAll<HTMLElement>(".contributor-name"),
  ).map((node) => node.textContent?.trim() ?? "");
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
