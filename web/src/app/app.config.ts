import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { isDevMode } from "@angular/core";
import type { ApplicationConfig } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideServiceWorker } from "@angular/service-worker";

import { routes } from "./app.routes";
import { participantIdInterceptor } from "./core/http/participant-id-interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([participantIdInterceptor])),
    provideRouter(routes),
    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode(),
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};
