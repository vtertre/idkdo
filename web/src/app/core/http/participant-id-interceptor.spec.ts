import {
  provideHttpClient,
  withInterceptors,
} from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { HttpClient } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";
import { participantIdHeaderName } from "@idkdo/shared";
import { firstValueFrom } from "rxjs";

import { SelectedParticipantContext } from "../identity/selected-participant-context";
import { participantIdInterceptor } from "./participant-id-interceptor";

const eventId = "4d8f4cb5-6188-420f-b2ec-12059c972793";
const participantId = "3b8dc5a0-9dbc-4e14-99a7-750df7c86fbb";

describe("participantIdInterceptor", () => {
  let context: SelectedParticipantContext;
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([participantIdInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    context = TestBed.inject(SelectedParticipantContext);
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    http.verify();
  });

  it("attaches the selected Participant header to /api requests", async () => {
    context.set({ eventId, participantId });

    const result = firstValueFrom(client.get("/api/participants"));
    const request = http.expectOne("/api/participants");

    expect(request.request.headers.get(participantIdHeaderName)).toBe(participantId);
    request.flush({});

    await expect(result).resolves.toEqual({});
  });

  it("leaves /api requests untouched when there is no selected Participant", async () => {
    const result = firstValueFrom(client.get("/api/participants"));
    const request = http.expectOne("/api/participants");

    expect(request.request.headers.has(participantIdHeaderName)).toBe(false);
    request.flush({});

    await expect(result).resolves.toEqual({});
  });

  it("leaves non-/api requests untouched", async () => {
    context.set({ eventId, participantId });

    const result = firstValueFrom(client.get("/assets/config.json"));
    const request = http.expectOne("/assets/config.json");

    expect(request.request.headers.has(participantIdHeaderName)).toBe(false);
    request.flush({});

    await expect(result).resolves.toEqual({});
  });
});
