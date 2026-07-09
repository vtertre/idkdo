import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import {
  apiErrorResponseSchema,
  createWishResponseSchema,
  getParticipantWishesResponseSchema,
  updateWishResponseSchema,
  type CreateWishResponse,
  type GetParticipantWishesResponse,
  type UpdateWishResponse,
} from "@idkdo/shared";
import { catchError, map, throwError } from "rxjs";
import type { Observable } from "rxjs";

import { WishRepositoryError } from "./wish-repository-error";

@Injectable({ providedIn: "root" })
export class WishRepository {
  private readonly http = inject(HttpClient);

  createWish(
    participantId: string,
    content: string,
  ): Observable<CreateWishResponse> {
    return this.http
      .post<unknown>(`/api/participants/${participantId}/wishes`, { content })
      .pipe(
        map((response) => createWishResponseSchema.parse(response)),
        catchError((error: unknown) => throwError(() => normalizeError(error))),
      );
  }

  getParticipantWishes(
    participantId: string,
  ): Observable<GetParticipantWishesResponse> {
    return this.http
      .get<unknown>(`/api/participants/${participantId}/wishes`)
      .pipe(
        map((response) => getParticipantWishesResponseSchema.parse(response)),
        catchError((error: unknown) => throwError(() => normalizeError(error))),
      );
  }

  updateWish(wishId: string, content: string): Observable<UpdateWishResponse> {
    return this.http.patch<unknown>(`/api/wishes/${wishId}`, { content }).pipe(
      map((response) => updateWishResponseSchema.parse(response)),
      catchError((error: unknown) => throwError(() => normalizeError(error))),
    );
  }

  deleteWish(wishId: string): Observable<void> {
    return this.http.delete<void>(`/api/wishes/${wishId}`).pipe(
      map(() => undefined),
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
