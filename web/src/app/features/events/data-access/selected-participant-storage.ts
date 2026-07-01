import { InjectionToken, Service, inject } from "@angular/core";

export const selectedParticipantStorageBackend =
  new InjectionToken<Storage | null>("selectedParticipantStorageBackend", {
    providedIn: "root",
    factory: () => getLocalStorage(),
  });

@Service()
export class SelectedParticipantStorage {
  private readonly storage = inject(selectedParticipantStorageBackend);

  getSelectedParticipantId(eventId: string): string | null {
    try {
      return this.storage?.getItem(storageKey(eventId)) ?? null;
    } catch {
      return null;
    }
  }

  setSelectedParticipantId(eventId: string, participantId: string): void {
    try {
      this.storage?.setItem(storageKey(eventId), participantId);
    } catch {
      // localStorage may be unavailable in private browsing or locked-down contexts.
    }
  }

  clearSelectedParticipantId(eventId: string): void {
    try {
      this.storage?.removeItem(storageKey(eventId));
    } catch {
      // localStorage may be unavailable in private browsing or locked-down contexts.
    }
  }
}

function storageKey(eventId: string): string {
  return `idkdo:event:${eventId}:selectedParticipantId`;
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
