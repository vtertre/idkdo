import { inject } from "@angular/core";
import { RedirectCommand, Router } from "@angular/router";
import type { ResolveFn } from "@angular/router";
import type { GetEventEntryPageResponse } from "@idkdo/shared";
import { catchError, of, retry, throwError, timer } from "rxjs";
import type { Observable } from "rxjs";

import { createResolvedEntityProvider } from "../../../core/router/create-resolved-entity-provider";
import { resolveOneById } from "../../../core/router/resolve-one-by-id";
import { EventRepositoryError } from "./event-repository-error";
import { EventRepository } from "./event-repository";

const routeDataKey = "event";
const retryDelays = [50, 100, 200, 400] as const;
const [injectEvent, provideEvent, eventToken] =
  createResolvedEntityProvider<GetEventEntryPageResponse>(routeDataKey);

const eventResolver: ResolveFn<GetEventEntryPageResponse | RedirectCommand> =
  resolveOneById("eventId", (eventId) => eventWithProjectionLagRetry(eventId));

export const eventEntryRoute = {
  dataKey: routeDataKey,
  injectEvent,
  provideEvent,
  resolve: eventResolver,
  token: eventToken,
} as const;

function eventWithProjectionLagRetry(
  eventId: string,
): Observable<GetEventEntryPageResponse | RedirectCommand> {
  const router = inject(Router);

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
    catchError(() =>
      of(
        new RedirectCommand(
          router.parseUrl(`/events/${eventId}/unavailable`),
          { replaceUrl: true },
        ),
      ),
    ),
  );
}
