import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import {
  apiErrorResponseSchema,
  createEventResponseSchema,
  getEventEntryPageResponseSchema,
  type CreateEventResponse,
  type GetEventEntryPageResponse,
} from "@idkdo/shared";
import { firstValueFrom } from "rxjs";

export class EventRepositoryError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
    readonly code: string | undefined,
  ) {
    super(message);
    this.name = "EventRepositoryError";
  }
}

@Injectable({ providedIn: "root" })
export class EventRepository {
  private readonly http = inject(HttpClient);

  async createEvent(name: string): Promise<CreateEventResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<unknown>("/api/events", { name }),
      );
      return createEventResponseSchema.parse(response);
    } catch (error: unknown) {
      throw normalizeError(error);
    }
  }

  async getEvent(eventId: string): Promise<GetEventEntryPageResponse> {
    try {
      const response = await firstValueFrom(
        this.http.get<unknown>(`/api/events/${eventId}`),
      );
      return getEventEntryPageResponseSchema.parse(response);
    } catch (error: unknown) {
      throw normalizeError(error);
    }
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
      "The request failed. Please try again.",
      error.status || undefined,
      undefined,
    );
  }

  return new EventRepositoryError(
    "The server returned an unexpected response. Please try again.",
    undefined,
    undefined,
  );
}
