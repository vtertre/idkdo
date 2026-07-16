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

import { ReservationRepository } from "./reservation-repository";

const wishId = "77dbbaf2-9115-47b5-b58d-5871ce25fc2d";
const reservationResponse = {
  contributors: [
    {
      createdAt: "2026-07-08T10:00:00.000Z",
      participantId: "941e70aa-4981-4580-8f7d-0ff63f1d54ce",
    },
  ],
  createdAt: "2026-07-08T10:00:00.000Z",
  id: "2ac83c83-bd5d-467f-9253-3640e00cc02d",
  updatedAt: "2026-07-08T10:00:00.000Z",
  wishId,
};

let repository: ReservationRepository;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptorsFromDi()),
      provideHttpClientTesting(),
    ],
  });
  repository = TestBed.inject(ReservationRepository);
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => {
  http.verify();
});

describe("ReservationRepository", () => {
  it("creates a Reservation with the exact API request", async () => {
    const result = firstValueFrom(repository.createReservation(wishId));
    const request = http.expectOne(`/api/wishes/${wishId}/reservation`);

    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual({});
    request.flush(reservationResponse);

    await expect(result).resolves.toEqual(reservationResponse);
  });

  it("normalizes a conflict with its status and code", async () => {
    const result = firstValueFrom(repository.createReservation(wishId));
    http.expectOne(`/api/wishes/${wishId}/reservation`).flush(
      {
        error: {
          code: "RESERVATION_ALREADY_EXISTS",
          message: "This wish is already reserved.",
        },
      },
      { status: 409, statusText: "Conflict" },
    );

    await expect(result).rejects.toEqual(
      expect.objectContaining({
        code: "RESERVATION_ALREADY_EXISTS",
        status: 409,
      }),
    );
  });

  it("rejects a malformed successful response", async () => {
    const result = firstValueFrom(repository.createReservation(wishId));
    http
      .expectOne(`/api/wishes/${wishId}/reservation`)
      .flush({ ...reservationResponse, contributors: [] });

    await expect(result).rejects.toMatchObject({
      message: "Le serveur a renvoyé une réponse inattendue. Réessayez.",
    });
  });

  it("adds a Contributor with the exact API request", async () => {
    const participantId = "2084efff-63b5-4a2d-b5f5-b1a25067cc86";
    const result = firstValueFrom(
      repository.addContributor(reservationResponse.id, participantId),
    );
    const request = http.expectOne(
      `/api/reservations/${reservationResponse.id}/contributors`,
    );

    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual({ participantId });
    request.flush(reservationResponse);

    await expect(result).resolves.toEqual(reservationResponse);
  });

  it("normalizes an add conflict with its status and code", async () => {
    const participantId = "2084efff-63b5-4a2d-b5f5-b1a25067cc86";
    const result = firstValueFrom(
      repository.addContributor(reservationResponse.id, participantId),
    );
    http
      .expectOne(`/api/reservations/${reservationResponse.id}/contributors`)
      .flush(
        {
          error: {
            code: "CONTRIBUTOR_ALREADY_EXISTS",
            message: "This participant already contributes to the reservation.",
          },
        },
        { status: 409, statusText: "Conflict" },
      );

    await expect(result).rejects.toEqual(
      expect.objectContaining({
        code: "CONTRIBUTOR_ALREADY_EXISTS",
        status: 409,
      }),
    );
  });

  it("removes a Contributor with the exact API request", async () => {
    const participantId = reservationResponse.contributors[0]!.participantId;
    const result = firstValueFrom(
      repository.removeContributor(reservationResponse.id, participantId),
    );
    const request = http.expectOne(
      `/api/reservations/${reservationResponse.id}/contributors/${participantId}`,
    );

    expect(request.request.method).toBe("DELETE");
    request.flush({ reservation: reservationResponse });

    await expect(result).resolves.toEqual({ reservation: reservationResponse });
  });

  it("parses a null reservation from a remove response", async () => {
    const participantId = reservationResponse.contributors[0]!.participantId;
    const result = firstValueFrom(
      repository.removeContributor(reservationResponse.id, participantId),
    );
    http
      .expectOne(
        `/api/reservations/${reservationResponse.id}/contributors/${participantId}`,
      )
      .flush({ reservation: null });

    await expect(result).resolves.toEqual({ reservation: null });
  });
});
