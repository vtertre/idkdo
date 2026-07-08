import { Service, signal } from "@angular/core";

export type SelectedParticipantSelection = {
  readonly eventId: string;
  readonly participantId: string;
};

@Service()
export class SelectedParticipantContext {
  private readonly selectionSignal =
    signal<SelectedParticipantSelection | null>(null);

  readonly selection = this.selectionSignal.asReadonly();

  set(selection: SelectedParticipantSelection): void {
    this.selectionSignal.set(selection);
  }

  clear(): void {
    this.selectionSignal.set(null);
  }
}
