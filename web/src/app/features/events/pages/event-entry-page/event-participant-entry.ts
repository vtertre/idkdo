import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  model,
  signal,
} from "@angular/core";
import {
  FormField,
  form,
  required,
  submit,
  validateStandardSchema,
} from "@angular/forms/signals";
import {
  createParticipantRequestBodySchema,
  type GetEventEntryPageResponse,
  type ParticipantSummary,
} from "@idkdo/shared";
import { firstValueFrom } from "rxjs";

import { EventRepositoryError } from "../../data-access/event-repository-error";
import { EventRepository } from "../../data-access/event-repository";
import { SelectedParticipantStorage } from "../../data-access/selected-participant-storage";

@Component({
  selector: "app-event-participant-entry",
  imports: [FormField],
  templateUrl: "./event-participant-entry.html",
  styleUrl: "./event-participant-entry.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventParticipantEntry {
  private readonly repository = inject(EventRepository);
  private readonly selectedParticipantStorage = inject(SelectedParticipantStorage);

  readonly eventEntry = model.required<GetEventEntryPageResponse>();
  protected readonly selectedParticipantId = linkedSignal({
    source: this.eventEntry,
    computation: (eventEntry, previous) => {
      if (previous?.source.id === eventEntry.id) {
        return previous.value;
      }

      return this.readInitialParticipantId(eventEntry);
    },
  });
  protected readonly selectedParticipant = computed(() => {
    const selectedId = this.selectedParticipantId();

    return (
      this.eventEntry().participants.find(
        (participant) => participant.id === selectedId,
      ) ?? null
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
    this.selectedParticipantStorage.clearSelectedParticipantId(this.eventEntry().id);
    this.selectedParticipantId.set(null);
  }

  protected onCreateParticipant(event: SubmitEvent): void {
    event.preventDefault();
    this.submitError.set(null);

    void submit(this.participantForm, async (form) => {
      try {
        const participant = await firstValueFrom(
          this.repository.createParticipant(
            this.eventEntry().id,
            form().value().name,
          ),
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

  private readInitialParticipantId(
    eventEntry: GetEventEntryPageResponse,
  ): string | null {
    const storedId = this.selectedParticipantStorage.getSelectedParticipantId(
      eventEntry.id,
    );

    if (storedId === null) {
      return null;
    }

    if (eventEntry.participants.some((participant) => participant.id === storedId)) {
      return storedId;
    }

    // The Event entry projection can lag behind a successful Participant create.
    // Missing from this snapshot means "not selectable yet", not "stale forever".
    return null;
  }

  private mergeParticipant(participant: ParticipantSummary): void {
    this.eventEntry.update((eventEntry) => {
      if (
        eventEntry.participants.some(
          (existingParticipant) => existingParticipant.id === participant.id,
        )
      ) {
        return eventEntry;
      }

      return {
        ...eventEntry,
        participants: sortParticipants([...eventEntry.participants, participant]),
      };
    });
  }

  private storeSelectedParticipant(participantId: string): void {
    this.selectedParticipantStorage.setSelectedParticipantId(
      this.eventEntry().id,
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
