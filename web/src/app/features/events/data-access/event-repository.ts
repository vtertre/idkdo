import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import {
  apiErrorResponseSchema,
  createEventResponseSchema,
  getEventEntryPageResponseSchema,
  type CreateEventResponse,
  type GetEventEntryPageResponse,
} from "@idkdo/shared";
import { catchError, map, throwError } from "rxjs";
import type { Observable } from "rxjs";

import { EventRepositoryError } from "./event-repository-error";

@Injectable({ providedIn: "root" })
export class EventRepository {
  private readonly http = inject(HttpClient);

  createEvent(name: string): Observable<CreateEventResponse> {
    return this.http.post<unknown>("/api/events", { name }).pipe(
      map((response) => createEventResponseSchema.parse(response)),
      catchError((error: unknown) => throwError(() => normalizeError(error))),
    );
  }

  getEvent(eventId: string): Observable<GetEventEntryPageResponse> {
    return this.http.get<unknown>(`/api/events/${eventId}`).pipe(
      map((response) => getEventEntryPageResponseSchema.parse(response)),
      catchError((error: unknown) => throwError(() => normalizeError(error))),
    );
  }
}

function normalizeError(error: unknown): EventRepositoryError {
  if (error instanceof EventRepositoryError) {
    return error;
  }

  if (error instanceof HttpErrorResponse) {
    const parsed = apiErrorResponseSchema.safeParse(error.error);
    if (parsed.success) {
      return new EventRepositoryError(
        parsed.data.error.message,
        error.status,
        parsed.data.error.code,
      );
    }

    return new EventRepositoryError(
      "La requête a échoué. Réessayez.",
      error.status || undefined,
      undefined,
    );
  }

  return new EventRepositoryError(
    "Le serveur a renvoyé une réponse inattendue. Réessayez.",
    undefined,
    undefined,
  );
}
