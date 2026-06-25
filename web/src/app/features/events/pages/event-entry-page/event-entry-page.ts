import { ChangeDetectionStrategy, Component, computed } from "@angular/core";

import { eventEntryRoute } from "../../data-access/event-entry-route";

@Component({
  selector: "app-event-entry-page",
  providers: [eventEntryRoute.provideEvent()],
  templateUrl: "./event-entry-page.html",
  styleUrl: "./event-entry-page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEntryPage {
  protected readonly event = eventEntryRoute.injectEvent();
  protected readonly shareUrl = computed(
    () => new URL(`/events/${this.event().id}`, window.location.origin).href,
  );
}
