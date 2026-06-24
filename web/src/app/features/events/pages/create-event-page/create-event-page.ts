import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import {
  FormField,
  form,
  required,
  submit,
  validateStandardSchema,
} from "@angular/forms/signals";
import { Router } from "@angular/router";
import { createEventRequestBodySchema } from "@idkdo/shared";

import { EventRepositoryError } from "../../data-access/event-repository-error";
import { EventRepository } from "../../data-access/event-repository";

@Component({
  selector: "app-create-event-page",
  imports: [FormField],
  templateUrl: "./create-event-page.html",
  styleUrl: "./create-event-page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEventPage {
  private readonly repository = inject(EventRepository);
  private readonly router = inject(Router);

  protected readonly model = signal({ name: "" });
  protected readonly eventForm = form(this.model, (event) => {
    required(event.name, { message: "Enter an Event name." });
    validateStandardSchema(event, createEventRequestBodySchema);
  });
  protected readonly submitError = signal<string | null>(null);

  protected onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    this.submitError.set(null);
    void submit(this.eventForm, async (form) => {
      try {
        const created = await this.repository.createEvent(form().value().name);
        await this.router.navigate(["/events", created.id]);
        return undefined;
      } catch (error: unknown) {
        const message =
          error instanceof EventRepositoryError
            ? error.message
            : "The Event could not be created. Please try again.";
        this.submitError.set(message);
        return { kind: "server", message };
      }
    });
  }
}
