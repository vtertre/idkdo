import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";

import { EventRepositoryError } from "../../data-access/event-repository-error";
import { EventRepository } from "../../data-access/event-repository";
import { CreateEventPage } from "./create-event-page";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";

describe("CreateEventPage", () => {
  const createEvent = vi.fn<EventRepository["createEvent"]>();
  const navigate = vi.fn<Router["navigate"]>();

  beforeEach(() => {
    createEvent.mockReset();
    navigate.mockReset();
    navigate.mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [CreateEventPage],
      providers: [
        { provide: EventRepository, useValue: { createEvent } },
        { provide: Router, useValue: { navigate } },
      ],
    });
  });

  it("rejects a blank or whitespace-only name", async () => {
    const fixture = TestBed.createComponent(CreateEventPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    setName(element, "   ");

    submitForm(element);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(createEvent).not.toHaveBeenCalled();
    const input = element.querySelector<HTMLInputElement>("input");
    const error = element.querySelector<HTMLElement>("#event-name-error");
    expect(error?.textContent?.trim()).toBe("Enter an Event name.");
    expect(element.textContent).not.toContain("Too small");
    expect(input?.getAttribute("aria-invalid")).toBe("true");
    expect(input?.getAttribute("aria-describedby")).toBe("event-name-error");
  });

  it("creates once and navigates to the Event link", async () => {
    createEvent.mockResolvedValue({ id: eventId });
    const fixture = TestBed.createComponent(CreateEventPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    setName(element, "Christmas 2026");

    submitForm(element);
    await fixture.whenStable();

    expect(createEvent).toHaveBeenCalledOnce();
    expect(createEvent).toHaveBeenCalledWith("Christmas 2026");
    expect(navigate).toHaveBeenCalledWith(["/events", eventId]);
  });

  it("prevents a duplicate submission while pending", async () => {
    let resolveRequest!: (value: { id: string }) => void;
    createEvent.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const fixture = TestBed.createComponent(CreateEventPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    setName(element, "Christmas 2026");

    submitForm(element);
    submitForm(element);
    fixture.detectChanges();

    expect(createEvent).toHaveBeenCalledOnce();
    expect(
      element.querySelector<HTMLButtonElement>("button")?.disabled,
    ).toBe(true);

    resolveRequest({ id: eventId });
    await fixture.whenStable();
  });

  it("shows a failure, re-enables submission, and preserves input", async () => {
    createEvent.mockRejectedValue(
      new EventRepositoryError("Event creation failed.", 500, "FAILURE"),
    );
    const fixture = TestBed.createComponent(CreateEventPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    setName(element, "Christmas 2026");

    submitForm(element);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain("Event creation failed.");
    expect(
      element.querySelector<HTMLButtonElement>("button")?.disabled,
    ).toBe(false);
    expect(
      element.querySelector<HTMLInputElement>("input")?.value,
    ).toBe("Christmas 2026");
    expect(element.querySelector("[aria-live='polite']")).not.toBeNull();
  });
});

function setName(element: HTMLElement, name: string): void {
  const input = element.querySelector<HTMLInputElement>("input");
  if (!input) throw new Error("Expected the Event name input.");
  input.value = name;
  input.dispatchEvent(new Event("input"));
}

function submitForm(element: HTMLElement): void {
  const form = element.querySelector<HTMLFormElement>("form");
  if (!form) throw new Error("Expected the Event creation form.");
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
}
