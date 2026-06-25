import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { Router } from "@angular/router";

import { eventEntryState } from "../../data-access/event-entry-state";

@Component({
  selector: "app-event-entry-page",
  providers: [eventEntryState.provide()],
  templateUrl: "./event-entry-page.html",
  styleUrl: "./event-entry-page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEntryPage {
  private readonly router = inject(Router);
  private readonly state = eventEntryState.inject();

  protected readonly event = this.state.event;
  protected readonly error = this.state.error;
  protected readonly shareUrl = computed(
    () => new URL(this.router.url, window.location.origin).href,
  );
}
