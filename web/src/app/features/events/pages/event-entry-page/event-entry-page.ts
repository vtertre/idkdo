import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import type { OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import type { GetEventEntryPageResponse } from "@idkdo/shared";

import { EventRepositoryError } from "../../data-access/event-repository-error";
import { EventRepository } from "../../data-access/event-repository";

const retryDelays = [50, 100, 200, 400] as const;

@Component({
  selector: "app-event-entry-page",
  templateUrl: "./event-entry-page.html",
  styleUrl: "./event-entry-page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEntryPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(EventRepository);

  protected readonly event = signal<GetEventEntryPageResponse | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly shareUrl = signal("");

  ngOnInit(): void {
    void this.loadEvent();
  }

  private async loadEvent(): Promise<void> {
    const eventId = this.route.snapshot.paramMap.get("eventId");
    if (!eventId) {
      this.error.set("This Event link is invalid.");
      this.loading.set(false);
      return;
    }

    try {
      const loaded = await this.getEventWithRetry(eventId);
      this.event.set(loaded);
      this.shareUrl.set(new URL(this.router.url, window.location.origin).href);
    } catch (error: unknown) {
      this.error.set(
        error instanceof EventRepositoryError
          ? error.message
          : "The Event could not be loaded. Please try again.",
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async getEventWithRetry(
    eventId: string,
  ): Promise<GetEventEntryPageResponse> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.repository.getEvent(eventId);
      } catch (error: unknown) {
        const retryDelay = retryDelays[attempt];
        if (!(error instanceof EventRepositoryError) || error.status !== 404 || retryDelay === undefined) {
          throw error;
        }
        await delay(retryDelay);
      }
    }
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
