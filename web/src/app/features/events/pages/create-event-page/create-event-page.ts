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
import { firstValueFrom } from "rxjs";

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
    required(event.name, { message: "Saisissez un nom d’événement." });
    validateStandardSchema(event, createEventRequestBodySchema);
  });
  protected readonly submitError = signal<string | null>(null);

  protected onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    this.submitError.set(null);
    void submit(this.eventForm, async (form) => {
      try {
        const created = await firstValueFrom(
          this.repository.createEvent(form().value().name),
        );
        await this.router.navigate(["/events", created.id]);
        return undefined;
      } catch {
        const message = "L’événement n’a pas pu être créé. Réessayez.";
        this.submitError.set(message);
        return { kind: "server", message };
      }
    });
  }
}
