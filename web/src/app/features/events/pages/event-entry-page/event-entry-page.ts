import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { Router } from "@angular/router";

import { eventEntryRoute } from "../../data-access/event-entry-route";

@Component({
  selector: "app-event-entry-page",
  providers: [eventEntryRoute.provideEvent()],
  templateUrl: "./event-entry-page.html",
  styleUrl: "./event-entry-page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEntryPage {
  private readonly router = inject(Router);

  protected readonly event = eventEntryRoute.injectEvent();
  protected readonly shareUrl = computed(
    () => new URL(this.router.url, window.location.origin).href,
  );
}
