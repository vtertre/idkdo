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
});
