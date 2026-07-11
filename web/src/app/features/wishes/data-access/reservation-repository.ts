import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import {
  addContributorResponseSchema,
  apiErrorResponseSchema,
  createReservationResponseSchema,
  removeContributorResponseSchema,
  type AddContributorResponse,
  type CreateReservationResponse,
  type RemoveContributorResponse,
} from "@idkdo/shared";
import { catchError, map, throwError } from "rxjs";
import type { Observable } from "rxjs";

import { WishRepositoryError } from "./wish-repository-error";

@Injectable({ providedIn: "root" })
export class ReservationRepository {
  private readonly http = inject(HttpClient);

  createReservation(wishId: string): Observable<CreateReservationResponse> {
    return this.http
      .post<unknown>(`/api/wishes/${wishId}/reservation`, {})
      .pipe(
        map((response) => createReservationResponseSchema.parse(response)),
        catchError((error: unknown) => throwError(() => normalizeError(error))),
      );
  }

  addContributor(
    reservationId: string,
    participantId: string,
  ): Observable<AddContributorResponse> {
    return this.http
      .post<unknown>(`/api/reservations/${reservationId}/contributors`, {
        participantId,
      })
      .pipe(
        map((response) => addContributorResponseSchema.parse(response)),
        catchError((error: unknown) => throwError(() => normalizeError(error))),
      );
  }

  removeContributor(
    reservationId: string,
    participantId: string,
  ): Observable<RemoveContributorResponse> {
    return this.http
      .delete<unknown>(
        `/api/reservations/${reservationId}/contributors/${participantId}`,
      )
      .pipe(
        map((response) => removeContributorResponseSchema.parse(response)),
        catchError((error: unknown) => throwError(() => normalizeError(error))),
      );
  }
}

function normalizeError(error: unknown): WishRepositoryError {
  if (error instanceof WishRepositoryError) {
    return error;
  }

  if (error instanceof HttpErrorResponse) {
    const parsed = apiErrorResponseSchema.safeParse(error.error);
    if (parsed.success) {
      return new WishRepositoryError(
        parsed.data.error.message,
        error.status,
        parsed.data.error.code,
      );
    }

    return new WishRepositoryError(
      "La requête a échoué. Réessayez.",
      error.status || undefined,
      undefined,
    );
  }

  return new WishRepositoryError(
    "Le serveur a renvoyé une réponse inattendue. Réessayez.",
    undefined,
    undefined,
  );
}
