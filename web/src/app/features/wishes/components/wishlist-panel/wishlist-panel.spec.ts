import { ComponentFixture, TestBed } from "@angular/core/testing";
import type { WishSummary } from "@idkdo/shared";
import { Subject, of, throwError } from "rxjs";

import { WishRepositoryError } from "../../data-access/wish-repository-error";
import { WishRepository } from "../../data-access/wish-repository";
import { WishlistPanel } from "./wishlist-panel";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";
const participantId = "3b8dc5a0-9dbc-4e14-99a7-750df7c86fbb";
const wish: WishSummary = {
  content: "Chocolat\nhttps://example.com/x",
  createdAt: "2026-07-08T10:00:00.000Z",
  eventId,
  id: "77dbbaf2-9115-47b5-b58d-5871ce25fc2d",
  updatedAt: "2026-07-08T10:00:00.000Z",
  wisherId: participantId,
};
const secondWish: WishSummary = {
  content: "Livre",
  createdAt: "2026-07-08T10:00:00.000Z",
  eventId,
  id: "3909642a-8794-48dc-8815-1ff79dca34bb",
  updatedAt: "2026-07-08T10:00:00.000Z",
  wisherId: participantId,
};

const getParticipantWishes = vi.fn<WishRepository["getParticipantWishes"]>();
const createWish = vi.fn<WishRepository["createWish"]>();
const updateWish = vi.fn<WishRepository["updateWish"]>();
const deleteWish = vi.fn<WishRepository["deleteWish"]>();

beforeEach(() => {
  getParticipantWishes.mockReset();
  getParticipantWishes.mockReturnValue(of({ wishes: [] }));
  createWish.mockReset();
  createWish.mockReturnValue(of(wish));
  updateWish.mockReset();
  updateWish.mockReturnValue(of({ ...wish, content: "Chocolat noir" }));
  deleteWish.mockReset();
  deleteWish.mockReturnValue(of(undefined));
  TestBed.configureTestingModule({
    imports: [WishlistPanel],
    providers: [
      {
        provide: WishRepository,
        useValue: { createWish, deleteWish, getParticipantWishes, updateWish },
      },
    ],
  });
});

describe("WishlistPanel loading and creation", () => {
  it("loads and renders wishes", async () => {
    getParticipantWishes.mockReturnValue(of({ wishes: [wish] }));

    const { element } = await createPanel();

    expect(getParticipantWishes).toHaveBeenCalledWith(participantId);
    expect(element.textContent).toContain("Chocolat");
    expect(element.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com/x",
    );
  });

  it("appends the created Wish and clears the textarea", async () => {
    const created = { ...wish, id: "8338fb5f-ee2d-45d0-bb09-15f67b5f6cb9" };
    createWish.mockReturnValue(of(created));
    const { element, fixture } = await createPanel();

    setWishContent(element, "  Chocolat  ");
    submitWishForm(element);
    await fixture.whenStable();

    expect(createWish).toHaveBeenCalledWith(participantId, "  Chocolat  ");
    expect(element.textContent).toContain("Chocolat");
    expect(element.querySelector<HTMLTextAreaElement>("#wish-content")?.value).toBe(
      "",
    );
  });

  it("prevents duplicate submissions while a create request is pending", async () => {
    const request = new Subject<WishSummary>();
    createWish.mockReturnValue(request.asObservable());
    const { element, fixture } = await createPanel();

    setWishContent(element, "Chocolat");
    submitWishForm(element);
    await fixture.whenStable();
    submitWishForm(element);

    expect(createWish).toHaveBeenCalledOnce();
    expect(
      element.querySelector<HTMLButtonElement>("button[type='submit']")?.disabled,
    ).toBe(true);

    request.next(wish);
    request.complete();
  });

  it("surfaces submit errors", async () => {
    createWish.mockReturnValue(
      throwError(() => new WishRepositoryError("Failure.", 500, "FAILURE")),
    );
    const { element, fixture } = await createPanel();

    setWishContent(element, "Chocolat");
    submitWishForm(element);
    await fixture.whenStable();

    expect(element.textContent).toContain(
      "Le souhait n’a pas pu être ajouté. Réessayez.",
    );
    expect(element.querySelector<HTMLTextAreaElement>("#wish-content")?.value).toBe(
      "Chocolat",
    );
  });

  it("shows load errors and retries", async () => {
    getParticipantWishes
      .mockReturnValueOnce(
        throwError(() => new WishRepositoryError("Failure.", 500, "FAILURE")),
      )
      .mockReturnValueOnce(of({ wishes: [wish] }));
    const { element, fixture } = await createPanel();

    expect(element.textContent).toContain(
      "La liste n’a pas pu être chargée. Réessayez.",
    );

    clickButtonWithText(element, "Réessayer");
    await fixture.whenStable();

    expect(getParticipantWishes).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain("Chocolat");
  });

});

describe("WishlistPanel editing", () => {
  it("replaces an updated Wish and closes the editor", async () => {
    const updatedWish = {
      ...wish,
      content: "Chocolat noir",
      updatedAt: "2026-07-08T10:01:00.000Z",
    };
    getParticipantWishes.mockReturnValue(of({ wishes: [wish] }));
    updateWish.mockReturnValue(of(updatedWish));
    const { element, fixture } = await createPanel();

    clickButtonWithText(element, "Modifier");
    fixture.detectChanges();
    setTextareaValue(element, "Chocolat noir");
    submitEditForm(element);
    await fixture.whenStable();

    expect(updateWish).toHaveBeenCalledWith(wish.id, "Chocolat noir");
    expect(element.querySelector(".edit-form")).toBeNull();
    expect(element.textContent).toContain("Chocolat noir");
    expect(element.textContent).not.toContain("Chocolat\nhttps://example.com/x");
  });

  it("keeps the editor open and shows a French error when update fails", async () => {
    getParticipantWishes.mockReturnValue(of({ wishes: [wish] }));
    updateWish.mockReturnValue(
      throwError(() => new WishRepositoryError("Failure.", 500, "FAILURE")),
    );
    const { element, fixture } = await createPanel();

    clickButtonWithText(element, "Modifier");
    fixture.detectChanges();
    setTextareaValue(element, "Chocolat noir");
    submitEditForm(element);
    await fixture.whenStable();

    expect(element.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe(
      "Chocolat noir",
    );
    expect(element.textContent).toContain(
      "Le souhait n'a pas pu être modifié. Réessayez.",
    );
  });

  it("disables another item's edit submit while a mutation is pending", async () => {
    const request = new Subject<WishSummary>();
    getParticipantWishes.mockReturnValue(of({ wishes: [wish, secondWish] }));
    updateWish.mockReturnValue(request.asObservable());
    const { element, fixture } = await createPanel();
    const firstItem = itemContainingText(element, "Chocolat");
    const secondItem = itemContainingText(element, "Livre");

    clickButtonWithText(secondItem, "Modifier");
    fixture.detectChanges();
    clickButtonWithText(firstItem, "Modifier");
    fixture.detectChanges();
    setTextareaValue(firstItem, "Chocolat noir");
    submitEditForm(firstItem);
    await fixture.whenStable();

    expect(buttonWithText(secondItem, "Enregistrer")?.disabled).toBe(true);

    request.next({ ...wish, content: "Chocolat noir" });
    request.complete();
  });

  it("clears a stale mutation error when editing is cancelled", async () => {
    getParticipantWishes.mockReturnValue(of({ wishes: [wish] }));
    updateWish.mockReturnValue(
      throwError(() => new WishRepositoryError("Failure.", 500, "FAILURE")),
    );
    const { element, fixture } = await createPanel();

    clickButtonWithText(element, "Modifier");
    fixture.detectChanges();
    setTextareaValue(element, "Chocolat noir");
    submitEditForm(element);
    await fixture.whenStable();
    expect(element.textContent).toContain(
      "Le souhait n'a pas pu être modifié. Réessayez.",
    );

    clickButtonWithText(element, "Annuler");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.textContent).not.toContain(
      "Le souhait n'a pas pu être modifié. Réessayez.",
    );
  });
});

describe("WishlistPanel deletion", () => {
  it("removes a deleted Wish", async () => {
    getParticipantWishes.mockReturnValue(of({ wishes: [wish] }));
    const { element, fixture } = await createPanel();

    clickButtonWithText(element, "Supprimer");
    fixture.detectChanges();
    clickButtonWithText(element, "Confirmer");
    await fixture.whenStable();

    expect(deleteWish).toHaveBeenCalledWith(wish.id);
    expect(element.textContent).not.toContain("Chocolat");
    expect(element.textContent).toContain("Aucun souhait pour le moment.");
  });

  it("keeps the item and shows a French error when delete fails", async () => {
    getParticipantWishes.mockReturnValue(of({ wishes: [wish] }));
    deleteWish.mockReturnValue(
      throwError(() => new WishRepositoryError("Failure.", 500, "FAILURE")),
    );
    const { element, fixture } = await createPanel();

    clickButtonWithText(element, "Supprimer");
    fixture.detectChanges();
    clickButtonWithText(element, "Confirmer");
    await fixture.whenStable();

    expect(element.textContent).toContain("Chocolat");
    expect(element.textContent).toContain(
      "Le souhait n'a pas pu être supprimé. Réessayez.",
    );
  });

  it("disables another item's delete confirmation while a mutation is pending", async () => {
    const request = new Subject<WishSummary>();
    getParticipantWishes.mockReturnValue(of({ wishes: [wish, secondWish] }));
    updateWish.mockReturnValue(request.asObservable());
    const { element, fixture } = await createPanel();
    const firstItem = itemContainingText(element, "Chocolat");
    const secondItem = itemContainingText(element, "Livre");

    clickButtonWithText(secondItem, "Supprimer");
    fixture.detectChanges();
    clickButtonWithText(firstItem, "Modifier");
    fixture.detectChanges();
    setTextareaValue(firstItem, "Chocolat noir");
    submitEditForm(firstItem);
    await fixture.whenStable();

    expect(buttonWithText(secondItem, "Confirmer")?.disabled).toBe(true);

    request.next({ ...wish, content: "Chocolat noir" });
    request.complete();
  });

  it("clears a stale mutation error when delete confirmation is cancelled", async () => {
    getParticipantWishes.mockReturnValue(of({ wishes: [wish] }));
    deleteWish.mockReturnValue(
      throwError(() => new WishRepositoryError("Failure.", 500, "FAILURE")),
    );
    const { element, fixture } = await createPanel();

    clickButtonWithText(element, "Supprimer");
    fixture.detectChanges();
    clickButtonWithText(element, "Confirmer");
    await fixture.whenStable();
    expect(element.textContent).toContain(
      "Le souhait n'a pas pu être supprimé. Réessayez.",
    );

    clickButtonWithText(element, "Annuler");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.textContent).not.toContain(
      "Le souhait n'a pas pu être supprimé. Réessayez.",
    );
  });
});

async function createPanel(): Promise<{
  readonly element: HTMLElement;
  readonly fixture: ComponentFixture<WishlistPanel>;
}> {
  const fixture = TestBed.createComponent(WishlistPanel);
  fixture.componentRef.setInput("participantId", participantId);
  await fixture.whenStable();

  return { element: fixture.nativeElement as HTMLElement, fixture };
}

function setWishContent(element: HTMLElement, content: string): void {
  const textarea = element.querySelector<HTMLTextAreaElement>("#wish-content");
  if (!textarea) throw new Error("Expected the Wish content textarea.");
  textarea.value = content;
  textarea.dispatchEvent(new Event("input"));
}

function submitWishForm(element: HTMLElement): void {
  const form = element.querySelector<HTMLFormElement>(".add-wish");
  if (!form) throw new Error("Expected the Wish creation form.");
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
}

function clickButtonWithText(element: HTMLElement, text: string): void {
  const button = buttonWithText(element, text);
  if (!button) throw new Error(`Expected a button named ${text}.`);
  button.click();
}

function buttonWithText(
  element: HTMLElement,
  text: string,
): HTMLButtonElement | undefined {
  return Array.from(element.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
}

function itemContainingText(element: HTMLElement, text: string): HTMLElement {
  const item = Array.from(element.querySelectorAll("li")).find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (!item) throw new Error(`Expected a Wish item containing ${text}.`);

  return item;
}

function setTextareaValue(element: HTMLElement, value: string): void {
  const textarea = element.querySelector<HTMLTextAreaElement>("textarea");
  if (!textarea) throw new Error("Expected a textarea.");
  textarea.value = value;
  textarea.dispatchEvent(new Event("input"));
}

function submitEditForm(element: HTMLElement): void {
  const form = element.querySelector<HTMLFormElement>(".edit-form");
  if (!form) throw new Error("Expected the Wish edit form.");
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
}
