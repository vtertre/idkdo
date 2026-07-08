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

const getParticipantWishes = vi.fn<WishRepository["getParticipantWishes"]>();
const createWish = vi.fn<WishRepository["createWish"]>();

beforeEach(() => {
  getParticipantWishes.mockReset();
  getParticipantWishes.mockReturnValue(of({ wishes: [] }));
  createWish.mockReset();
  createWish.mockReturnValue(of(wish));
  TestBed.configureTestingModule({
    imports: [WishlistPanel],
    providers: [
      {
        provide: WishRepository,
        useValue: { createWish, getParticipantWishes },
      },
    ],
  });
});

describe("WishlistPanel", () => {
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
  const button = Array.from(element.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  if (!button) throw new Error(`Expected a button named ${text}.`);
  button.click();
}
