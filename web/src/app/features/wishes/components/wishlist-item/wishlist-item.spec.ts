import { ComponentFixture, TestBed } from "@angular/core/testing";
import type { WishSummary } from "@idkdo/shared";

import { WishlistItem } from "./wishlist-item";

const wish: WishSummary = {
  content: "Chocolat\nhttps://example.com/x",
  createdAt: "2026-07-08T10:00:00.000Z",
  eventId: "4d8f4cb5-6188-420f-b2ec-12059c972793",
  id: "77dbbaf2-9115-47b5-b58d-5871ce25fc2d",
  updatedAt: "2026-07-08T10:00:00.000Z",
  wisherId: "3b8dc5a0-9dbc-4e14-99a7-750df7c86fbb",
};

describe("WishlistItem", () => {
  it("renders content and edit/delete actions in display state", async () => {
    const { element } = await createItem();

    expect(element.textContent).toContain("Chocolat");
    expect(element.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com/x",
    );
    expect(buttonWithText(element, "Modifier")).toBeTruthy();
    expect(buttonWithText(element, "Supprimer")).toBeTruthy();
  });

  it("shows a prefilled textarea when editing", async () => {
    const { element, fixture } = await createItem();

    clickButtonWithText(element, "Modifier");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe(
      wish.content,
    );
  });

  it("emits an update request with edited content", async () => {
    const { element, fixture } = await createItem();
    const updateSpy = vi.spyOn(fixture.componentInstance.updateRequested, "emit");

    clickButtonWithText(element, "Modifier");
    fixture.detectChanges();
    setTextareaValue(element, "Chocolat noir");
    submitEditForm(element);
    await fixture.whenStable();

    expect(updateSpy).toHaveBeenCalledWith({
      content: "Chocolat noir",
      wishId: wish.id,
    });
  });

  it("cancels editing without emitting", async () => {
    const { element, fixture } = await createItem();
    const updateSpy = vi.spyOn(fixture.componentInstance.updateRequested, "emit");
    const cancelledSpy = vi.spyOn(fixture.componentInstance.cancelled, "emit");

    clickButtonWithText(element, "Modifier");
    fixture.detectChanges();
    setTextareaValue(element, "Chocolat noir");
    clickButtonWithText(element, "Annuler");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(updateSpy).not.toHaveBeenCalled();
    expect(cancelledSpy).toHaveBeenCalledOnce();
    expect(element.querySelector("textarea")).toBeNull();
    expect(element.textContent).toContain("Chocolat");
  });

  it("requires confirmation before emitting a delete request", async () => {
    const { element, fixture } = await createItem();
    const deleteSpy = vi.spyOn(fixture.componentInstance.deleteRequested, "emit");

    clickButtonWithText(element, "Supprimer");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.textContent).toContain("Supprimer ce souhait ?");
    expect(deleteSpy).not.toHaveBeenCalled();

    clickButtonWithText(element, "Confirmer");
    await fixture.whenStable();

    expect(deleteSpy).toHaveBeenCalledWith({ wishId: wish.id });
  });

  it("cancels delete confirmation without emitting", async () => {
    const { element, fixture } = await createItem();
    const deleteSpy = vi.spyOn(fixture.componentInstance.deleteRequested, "emit");
    const cancelledSpy = vi.spyOn(fixture.componentInstance.cancelled, "emit");

    clickButtonWithText(element, "Supprimer");
    fixture.detectChanges();
    clickButtonWithText(element, "Annuler");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(cancelledSpy).toHaveBeenCalledOnce();
    expect(element.textContent).not.toContain("Supprimer ce souhait ?");
  });

  it("disables action buttons while busy", async () => {
    const { element } = await createItem({ busy: true });

    expect(buttonWithText(element, "Modifier")?.disabled).toBe(true);
    expect(buttonWithText(element, "Supprimer")?.disabled).toBe(true);
  });

  it("does not submit a blank draft", async () => {
    const { element, fixture } = await createItem();
    const updateSpy = vi.spyOn(fixture.componentInstance.updateRequested, "emit");

    clickButtonWithText(element, "Modifier");
    fixture.detectChanges();
    setTextareaValue(element, "   ");
    submitEditForm(element);
    await fixture.whenStable();

    expect(updateSpy).not.toHaveBeenCalled();
  });
});

async function createItem(
  options: { readonly busy?: boolean } = {},
): Promise<{
  readonly element: HTMLElement;
  readonly fixture: ComponentFixture<WishlistItem>;
}> {
  TestBed.configureTestingModule({
    imports: [WishlistItem],
  });
  const fixture = TestBed.createComponent(WishlistItem);
  fixture.componentRef.setInput("wish", wish);
  fixture.componentRef.setInput("busy", options.busy ?? false);
  await fixture.whenStable();

  return { element: fixture.nativeElement as HTMLElement, fixture };
}

function buttonWithText(
  element: HTMLElement,
  text: string,
): HTMLButtonElement | undefined {
  return Array.from(element.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
}

function clickButtonWithText(element: HTMLElement, text: string): void {
  const button = buttonWithText(element, text);
  if (!button) throw new Error(`Expected a button named ${text}.`);
  button.click();
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
