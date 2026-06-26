import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import {
  FormField,
  form,
  required,
  submit,
  validateStandardSchema,
} from "@angular/forms/signals";
import {
  createParticipantRequestBodySchema,
  type ParticipantSummary,
} from "@idkdo/shared";
import { firstValueFrom } from "rxjs";

import { eventEntryRoute } from "../../data-access/event-entry-route";
import { EventRepositoryError } from "../../data-access/event-repository-error";
import { EventRepository } from "../../data-access/event-repository";
import { SelectedParticipantStorage } from "../../data-access/selected-participant-storage";

@Component({
  selector: "app-event-entry-page",
  imports: [FormField],
  providers: [eventEntryRoute.provideEvent()],
  templateUrl: "./event-entry-page.html",
  styleUrl: "./event-entry-page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEntryPage {
  private readonly repository = inject(EventRepository);
  private readonly selectedParticipantStorage = inject(SelectedParticipantStorage);

  protected readonly event = eventEntryRoute.injectEvent();
  protected readonly shareUrl = computed(
    () => new URL(`/events/${this.event().id}`, window.location.origin).href,
  );
  protected readonly selectedParticipantId = signal<string | null>(
    this.readInitialParticipantId(),
  );
  protected readonly selectedParticipant = computed(() => {
    const selectedId = this.selectedParticipantId();

    return (
      this.event().participants.find((participant) => participant.id === selectedId) ??
      null
    );
  });
  protected readonly participantModel = signal({ name: "" });
  protected readonly participantForm = form(this.participantModel, (participant) => {
    required(participant.name, { message: "Saisissez votre nom." });
    validateStandardSchema(participant, createParticipantRequestBodySchema);
  });
  protected readonly submitError = signal<string | null>(null);

  protected selectParticipant(participant: ParticipantSummary): void {
    this.submitError.set(null);
    this.storeSelectedParticipant(participant.id);
  }

  protected changeParticipant(): void {
    this.submitError.set(null);
    this.selectedParticipantStorage.clearSelectedParticipantId(this.event().id);
    this.selectedParticipantId.set(null);
  }

  protected onCreateParticipant(event: SubmitEvent): void {
    event.preventDefault();
    this.submitError.set(null);

    void submit(this.participantForm, async (form) => {
      try {
        const participant = await firstValueFrom(
          this.repository.createParticipant(this.event().id, form().value().name),
        );

        this.mergeParticipant(participant);
        if (this.selectedParticipantId() === null) {
          this.storeSelectedParticipant(participant.id);
        }
        this.participantModel.set({ name: "" });

        return undefined;
      } catch (error) {
        const message = createParticipantErrorMessage(error);
        this.submitError.set(message);

        return undefined;
      }
    });
  }

  private readInitialParticipantId(): string | null {
    const storedId = this.selectedParticipantStorage.getSelectedParticipantId(
      this.event().id,
    );

    if (storedId === null) {
      return null;
    }

    if (this.event().participants.some((participant) => participant.id === storedId)) {
      return storedId;
    }

    // The Event entry projection can lag behind a successful Participant create.
    // Missing from this snapshot means "not selectable yet", not "stale forever".
    return null;
  }

  private mergeParticipant(participant: ParticipantSummary): void {
    this.event.update((event) => {
      if (
        event.participants.some(
          (existingParticipant) => existingParticipant.id === participant.id,
        )
      ) {
        return event;
      }

      return {
        ...event,
        participants: sortParticipants([...event.participants, participant]),
      };
    });
  }

  private storeSelectedParticipant(participantId: string): void {
    this.selectedParticipantStorage.setSelectedParticipantId(
      this.event().id,
      participantId,
    );
    this.selectedParticipantId.set(participantId);
  }
}

function sortParticipants(
  participants: readonly ParticipantSummary[],
): ParticipantSummary[] {
  return [...participants].sort((left, right) => {
    const createdAtOrder = left.createdAt.localeCompare(right.createdAt);

    if (createdAtOrder !== 0) {
      return createdAtOrder;
    }

    return left.id.localeCompare(right.id);
  });
}

function createParticipantErrorMessage(error: unknown): string {
  if (
    error instanceof EventRepositoryError &&
    (error.status === 409 || error.code === "PARTICIPANT_NAME_ALREADY_EXISTS")
  ) {
    return "Ce participant existe déjà pour cet événement.";
  }

  return "Le participant n’a pas pu être créé. Réessayez.";
}
