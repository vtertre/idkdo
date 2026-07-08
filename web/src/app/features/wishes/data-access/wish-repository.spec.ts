import {
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { firstValueFrom } from "rxjs";

import { WishRepository } from "./wish-repository";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";
const participantId = "3b8dc5a0-9dbc-4e14-99a7-750df7c86fbb";
const wishId = "77dbbaf2-9115-47b5-b58d-5871ce25fc2d";
const wishResponse = {
  content: "Chocolat\nhttps://example.com/x",
  createdAt: "2026-07-08T10:00:00.000Z",
  eventId,
  id: wishId,
  updatedAt: "2026-07-08T10:00:00.000Z",
  wisherId: participantId,
};

let repository: WishRepository;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptorsFromDi()),
      provideHttpClientTesting(),
    ],
  });
  repository = TestBed.inject(WishRepository);
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => {
  http.verify();
});

describe("WishRepository", () => {
  it("creates a Wish with the exact API request", async () => {
    const result = firstValueFrom(
      repository.createWish(participantId, "Chocolat"),
    );
    const request = http.expectOne(`/api/participants/${participantId}/wishes`);

    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual({ content: "Chocolat" });
    request.flush(wishResponse);

    await expect(result).resolves.toEqual(wishResponse);
  });

  it("loads and validates Participant Wishes", async () => {
    const result = firstValueFrom(repository.getParticipantWishes(participantId));
    const request = http.expectOne(`/api/participants/${participantId}/wishes`);

    expect(request.request.method).toBe("GET");
    request.flush({ wishes: [wishResponse] });

    await expect(result).resolves.toEqual({ wishes: [wishResponse] });
  });

  it("rejects a malformed successful response", async () => {
    const result = firstValueFrom(repository.getParticipantWishes(participantId));
    http
      .expectOne(`/api/participants/${participantId}/wishes`)
      .flush({ wishes: [{ id: "not-a-uuid" }] });

    await expect(result).rejects.toMatchObject({
      message: "Le serveur a renvoyé une réponse inattendue. Réessayez.",
    });
  });

  it("normalizes a shared API error", async () => {
    const result = firstValueFrom(repository.createWish(participantId, "Chocolat"));
    http.expectOne(`/api/participants/${participantId}/wishes`).flush(
      {
        error: {
          code: "CANNOT_CREATE_WISH_FOR_ANOTHER_PARTICIPANT",
          message: "A participant can only create wishes for themselves.",
        },
      },
      { status: 422, statusText: "Unprocessable Entity" },
    );

    await expect(result).rejects.toEqual(
      expect.objectContaining({
        code: "CANNOT_CREATE_WISH_FOR_ANOTHER_PARTICIPANT",
        message: "A participant can only create wishes for themselves.",
        status: 422,
      }),
    );
  });

  it("uses a safe fallback for malformed API errors", async () => {
    const result = firstValueFrom(repository.createWish(participantId, "Chocolat"));
    http.expectOne(`/api/participants/${participantId}/wishes`).flush(
      { message: "not the shared error contract" },
      { status: 500, statusText: "Server Error" },
    );

    await expect(result).rejects.toMatchObject({
      message: "La requête a échoué. Réessayez.",
      status: 500,
    });
  });
});
