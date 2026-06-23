import {
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { EventRepository } from "./event-repository";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";

describe("EventRepository", () => {
  let repository: EventRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    repository = TestBed.inject(EventRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it("creates an Event with the exact API request", async () => {
    const result = repository.createEvent("Christmas 2026");
    const request = http.expectOne("/api/events");

    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual({ name: "Christmas 2026" });
    request.flush({ id: eventId });

    await expect(result).resolves.toEqual({ id: eventId });
  });

  it("loads and validates an Event", async () => {
    const result = repository.getEvent(eventId);
    const request = http.expectOne(`/api/events/${eventId}`);

    expect(request.request.method).toBe("GET");
    request.flush({
      createdAt: "2026-06-23T12:00:00.000Z",
      id: eventId,
      name: "Christmas 2026",
      updatedAt: "2026-06-23T12:00:00.000Z",
    });

    await expect(result).resolves.toMatchObject({
      id: eventId,
      name: "Christmas 2026",
    });
  });

  it("rejects a malformed successful response", async () => {
    const result = repository.getEvent(eventId);
    http.expectOne(`/api/events/${eventId}`).flush({ id: "not-a-uuid" });

    await expect(result).rejects.toMatchObject({
      message: "The server returned an unexpected response. Please try again.",
    });
  });

  it("normalizes a shared API error", async () => {
    const result = repository.getEvent(eventId);
    http.expectOne(`/api/events/${eventId}`).flush(
      { error: { code: "EVENT_NOT_FOUND", message: "Event not found." } },
      { status: 404, statusText: "Not Found" },
    );

    await expect(result).rejects.toEqual(
      expect.objectContaining({
        code: "EVENT_NOT_FOUND",
        message: "Event not found.",
        status: 404,
      }),
    );
  });

  it("uses a safe fallback for malformed API errors", async () => {
    const result = repository.createEvent("Christmas 2026");
    http.expectOne("/api/events").flush(
      { message: "not the shared error contract" },
      { status: 500, statusText: "Server Error" },
    );

    await expect(result).rejects.toMatchObject({
      message: "The request failed. Please try again.",
      status: 500,
    });
  });
});
