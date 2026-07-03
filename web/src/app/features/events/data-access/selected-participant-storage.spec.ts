import { TestBed } from "@angular/core/testing";

import {
  SelectedParticipantStorage,
  selectedParticipantStorageBackend,
} from "./selected-participant-storage";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";
const otherEventId = "99966348-6e1d-49c3-bd11-541d2c5351f0";
const participantId = "3b8dc5a0-9dbc-4e14-99a7-750df7c86fbb";

describe("SelectedParticipantStorage", () => {
  it("stores selected Participant ids with Event-scoped keys", () => {
    const backend = new MemoryStorage();
    const storage = createStorage(backend);

    storage.setSelectedParticipantId(eventId, participantId);

    expect(storage.getSelectedParticipantId(eventId)).toBe(participantId);
    expect(storage.getSelectedParticipantId(otherEventId)).toBeNull();
    expect(backend.getItem(`idkdo:event:${eventId}:selectedParticipantId`)).toBe(
      participantId,
    );
  });

  it("clears only the selected Event id", () => {
    const backend = new MemoryStorage();
    const storage = createStorage(backend);

    storage.setSelectedParticipantId(eventId, participantId);
    storage.setSelectedParticipantId(otherEventId, "5a4efc19-13b6-454d-a159-223fe1a601cb");
    storage.clearSelectedParticipantId(eventId);

    expect(storage.getSelectedParticipantId(eventId)).toBeNull();
    expect(storage.getSelectedParticipantId(otherEventId)).not.toBeNull();
  });

  it("does not throw when browser storage is unavailable", () => {
    const storage = createStorage(new ThrowingStorage());

    expect(storage.getSelectedParticipantId(eventId)).toBeNull();
    expect(() =>
      storage.setSelectedParticipantId(eventId, participantId),
    ).not.toThrow();
    expect(() => storage.clearSelectedParticipantId(eventId)).not.toThrow();
  });
});

function createStorage(backend: Storage): SelectedParticipantStorage {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: selectedParticipantStorageBackend, useValue: backend },
    ],
  });

  return TestBed.inject(SelectedParticipantStorage);
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class ThrowingStorage implements Storage {
  get length(): number {
    throw new Error("Storage unavailable.");
  }

  clear(): void {
    throw new Error("Storage unavailable.");
  }

  getItem(): string | null {
    throw new Error("Storage unavailable.");
  }

  key(): string | null {
    throw new Error("Storage unavailable.");
  }

  removeItem(): void {
    throw new Error("Storage unavailable.");
  }

  setItem(): void {
    throw new Error("Storage unavailable.");
  }
}
