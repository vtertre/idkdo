import type { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { participantIdHeaderName } from "@idkdo/shared";

import { SelectedParticipantContext } from "../identity/selected-participant-context";

export const participantIdInterceptor: HttpInterceptorFn = (request, next) => {
  const selection = inject(SelectedParticipantContext).selection();

  if (!request.url.startsWith("/api") || selection === null) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        [participantIdHeaderName]: selection.participantId,
      },
    }),
  );
};
