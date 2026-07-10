import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import type { OnInit } from "@angular/core";
import { Router } from "@angular/router";

import { SelectedParticipantContext } from "../../../../core/identity/selected-participant-context";
import { EventWishesPanel } from "../../../wishes/components/event-wishes-panel/event-wishes-panel";
import { WishlistPanel } from "../../../wishes/components/wishlist-panel/wishlist-panel";
import { eventEntryRoute } from "../../data-access/event-entry-route";
import { SelectedParticipantStorage } from "../../data-access/selected-participant-storage";

@Component({
  selector: "app-event-home-page",
  imports: [EventWishesPanel, WishlistPanel],
  providers: [eventEntryRoute.provideEvent()],
  templateUrl: "./event-home-page.html",
  styleUrl: "./event-home-page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventHomePage implements OnInit {
  private readonly router = inject(Router);
  private readonly selectedParticipantContext = inject(SelectedParticipantContext);
  private readonly selectedParticipantStorage = inject(SelectedParticipantStorage);

  protected readonly event = eventEntryRoute.injectEvent();
  protected readonly activeTab = signal<"my-list" | "event-wishes">("my-list");
  protected readonly selectedParticipantId = computed(() => {
    const selection = this.selectedParticipantContext.selection();

    return selection?.eventId === this.event().id ? selection.participantId : null;
  });
  protected readonly selectedParticipant = computed(() => {
    const participantId = this.selectedParticipantId();

    return (
      this.event().participants.find(
        (participant) => participant.id === participantId,
      ) ?? null
    );
  });

  ngOnInit(): void {
    if (this.selectedParticipant() === null) {
      this.clearSelection();
      void this.router.navigate(["/events", this.event().id, "entry"], {
        replaceUrl: true,
      });
    }
  }

  protected changeParticipant(): void {
    this.clearSelection();
    void this.router.navigate(["/events", this.event().id, "entry"]);
  }

  protected selectTab(tab: "my-list" | "event-wishes"): void {
    this.activeTab.set(tab);
  }

  private clearSelection(): void {
    this.selectedParticipantStorage.clearSelectedParticipantId(this.event().id);
    this.selectedParticipantContext.clear();
  }
}
