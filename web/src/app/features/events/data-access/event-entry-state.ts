import { effect, inject, signal } from "@angular/core";
import type { WritableSignal } from "@angular/core";
import type { ResolveFn } from "@angular/router";
import type { GetEventEntryPageResponse } from "@idkdo/shared";
import { createInjectable } from "@signality/core";
import { routeData } from "@signality/core/router/route-data";
import { catchError, map, of, retry, throwError, timer } from "rxjs";

import { EventRepositoryError } from "./event-repository-error";
import { EventRepository } from "./event-repository";

const routeDataKey = "eventEntry";
const retryDelays = [50, 100, 200, 400] as const;

type EventEntryResolvedState =
  | { event: GetEventEntryPageResponse; error: null }
  | { event: null; error: string };

type EventEntryState = {
  readonly event: WritableSignal<GetEventEntryPageResponse | null>;
  readonly error: WritableSignal<string | null>;
};

const eventEntryResolver: ResolveFn<EventEntryResolvedState> = (route) => {
  const eventId = route.paramMap.get("eventId");
  if (!eventId) {
    return { event: null, error: "Ce lien d’événement est invalide." };
  }

  return inject(EventRepository).getEvent(eventId).pipe(
    retry({
      count: retryDelays.length,
      delay: (error: unknown, retryCount) => {
        const retryDelay = retryDelays[retryCount - 1];
        return error instanceof EventRepositoryError &&
          error.status === 404 &&
          retryDelay !== undefined
          ? timer(retryDelay)
          : throwError(() => error);
      },
    }),
    map((event) => ({ event, error: null }) satisfies EventEntryResolvedState),
    catchError((error: unknown) =>
      of({ event: null, error: eventEntryErrorMessage(error) }),
    ),
  );
};

const [injectEventEntryState, provideEventEntryState] = createInjectable(
  "EventEntryState",
  (): EventEntryState => {
    const data = routeData<Record<typeof routeDataKey, EventEntryResolvedState>>();
    const event = signal<GetEventEntryPageResponse | null>(null);
    const error = signal<string | null>(null);

    effect(() => {
      const resolved = data()[routeDataKey];
      event.set(resolved?.event ?? null);
      error.set(resolved?.error ?? null);
    });

    return {
      event,
      error,
    };
  },
);

export const eventEntryState = {
  inject: injectEventEntryState,
  provide: provideEventEntryState,
  resolve: eventEntryResolver,
  routeDataKey,
} as const;

function eventEntryErrorMessage(error: unknown): string {
  if (error instanceof EventRepositoryError && error.status === 404) {
    return "Cet événement est introuvable.";
  }

  return "L’événement n’a pas pu être chargé. Réessayez.";
}
