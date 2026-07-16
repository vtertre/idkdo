import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from "@angular/core";
import type {
  ParticipantSummary,
  ReservationSummary,
} from "@idkdo/shared";

type ContributorRow = {
  readonly isViewer: boolean;
  readonly name: string;
  readonly participantId: string;
};

type EligibleParticipant = {
  readonly id: string;
  readonly name: string;
};

@Component({
  selector: "app-reservation-coordination",
  templateUrl: "./reservation-coordination.html",
  styleUrl: "./reservation-coordination.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationCoordination {
  readonly reservation = input.required<ReservationSummary>();
  readonly viewerParticipantId = input.required<string>();
  readonly participants = input.required<readonly ParticipantSummary[]>();
  readonly wisherId = input.required<string>();
  readonly busy = input<boolean>(false);

  readonly joinRequested = output<void>();
  readonly addRequested = output<string>();
  readonly removeRequested = output<string>();

  protected readonly pickerOpen = signal(false);
  protected readonly selectedParticipantId = signal("");

  private readonly namesByParticipantId = computed(
    () =>
      new Map(
        this.participants().map((participant) => [
          participant.id,
          participant.name,
        ]),
      ),
  );

  protected readonly contributorRows = computed<readonly ContributorRow[]>(() => {
    const names = this.namesByParticipantId();
    const viewerId = this.viewerParticipantId();

    return this.reservation().contributors.map((contributor) => ({
      isViewer: contributor.participantId === viewerId,
      name: names.get(contributor.participantId) ?? "Quelqu'un",
      participantId: contributor.participantId,
    }));
  });

  protected readonly viewerContributes = computed(() => {
    const viewerId = this.viewerParticipantId();

    return this.reservation().contributors.some(
      (contributor) => contributor.participantId === viewerId,
    );
  });

  protected readonly eligibleParticipants = computed<
    readonly EligibleParticipant[]
  >(() => {
    const contributorIds = new Set(
      this.reservation().contributors.map(
        (contributor) => contributor.participantId,
      ),
    );
    const wisherId = this.wisherId();

    return this.participants()
      .filter(
        (participant) =>
          participant.id !== wisherId && !contributorIds.has(participant.id),
      )
      .map((participant) => ({ id: participant.id, name: participant.name }));
  });

  protected join(): void {
    if (this.busy()) {
      return;
    }

    this.joinRequested.emit();
  }

  protected remove(participantId: string): void {
    if (this.busy()) {
      return;
    }

    this.removeRequested.emit(participantId);
  }

  protected openPicker(): void {
    this.selectedParticipantId.set("");
    this.pickerOpen.set(true);
  }

  protected closePicker(): void {
    this.pickerOpen.set(false);
    this.selectedParticipantId.set("");
  }

  protected onPickerChange(event: Event): void {
    this.selectedParticipantId.set((event.target as HTMLSelectElement).value);
  }

  protected confirmAdd(): void {
    const participantId = this.selectedParticipantId();
    if (this.busy() || participantId === "") {
      return;
    }

    this.addRequested.emit(participantId);
    this.closePicker();
  }
}
