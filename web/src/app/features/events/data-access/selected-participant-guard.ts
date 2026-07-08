import { inject } from "@angular/core";
import type { CanActivateFn } from "@angular/router";
import { Router } from "@angular/router";

import { SelectedParticipantContext } from "../../../core/identity/selected-participant-context";
import { SelectedParticipantStorage } from "./selected-participant-storage";

export const selectedParticipantGuard: CanActivateFn = (route) => {
  const eventId = route.paramMap.get("eventId");

  if (!eventId) {
    throw new Error("Missing eventId");
  }

  const router = inject(Router);
  const participantId =
    inject(SelectedParticipantStorage).getSelectedParticipantId(eventId);

  if (participantId === null) {
    return router.parseUrl(`/events/${eventId}/entry`);
  }

  inject(SelectedParticipantContext).set({ eventId, participantId });

  return true;
};
