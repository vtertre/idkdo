import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from "@angular/core";
import type { OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import type {
  EventWish,
  ParticipantSummary,
  ReservationSummary,
} from "@idkdo/shared";
import { finalize } from "rxjs";

import { ReservationRepository } from "../../data-access/reservation-repository";
import { WishRepositoryError } from "../../data-access/wish-repository-error";
import { WishRepository } from "../../data-access/wish-repository";
import { WishContent } from "../wish-content/wish-content";

type EventWishGroup = {
  readonly isViewer: boolean;
  readonly name: string;
  readonly wishes: readonly EventWish[];
  readonly wisherId: string;
};

@Component({
  selector: "app-event-wishes-panel",
  imports: [WishContent],
  templateUrl: "./event-wishes-panel.html",
  styleUrl: "./event-wishes-panel.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventWishesPanel implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly reservationRepository = inject(ReservationRepository);
  private readonly repository = inject(WishRepository);

  readonly eventId = input.required<string>();
  readonly viewerParticipantId = input.required<string>();
  readonly participants = input.required<ParticipantSummary[]>();

  protected readonly wishes = signal<EventWish[]>([]);
  protected readonly loadPending = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly reservationErrors = signal<ReadonlyMap<string, string>>(
    new Map(),
  );
  protected readonly reservationPendingWishIds = signal<ReadonlySet<string>>(
    new Set(),
  );
  protected readonly groups = computed<readonly EventWishGroup[]>(() => {
    const wishesByWisherId = new Map<string, EventWish[]>();

    for (const wish of this.wishes()) {
      const wisherWishes = wishesByWisherId.get(wish.wisherId) ?? [];
      wisherWishes.push(wish);
      wishesByWisherId.set(wish.wisherId, wisherWishes);
    }

    const participants = this.participants();
    const knownParticipantIds = new Set(
      participants.map((participant) => participant.id),
    );
    const groups: EventWishGroup[] = participants.map((participant) => ({
      isViewer: participant.id === this.viewerParticipantId(),
      name: participant.name,
      wishes: wishesByWisherId.get(participant.id) ?? [],
      wisherId: participant.id,
    }));

    for (const [wisherId, wisherWishes] of wishesByWisherId) {
      if (!knownParticipantIds.has(wisherId)) {
        groups.push({
          isViewer: wisherId === this.viewerParticipantId(),
          name: "Participant inconnu",
          wishes: wisherWishes,
          wisherId,
        });
      }
    }

    return groups;
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    if (this.loadPending()) {
      return;
    }

    this.loadError.set(null);
    this.loadPending.set(true);
    this.repository
      .getEventWishes(this.eventId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loadPending.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.wishes.set(response.wishes);
        },
        error: () => {
          this.loadError.set(
            "Les listes n’ont pas pu être chargées. Réessayez.",
          );
        },
      });
  }

  reserve(wishId: string): void {
    if (this.reservationPendingWishIds().has(wishId)) {
      return;
    }

    this.reservationErrors.update((errors) => {
      const updated = new Map(errors);
      updated.delete(wishId);
      return updated;
    });
    this.reservationPendingWishIds.update(
      (pendingIds) => new Set(pendingIds).add(wishId),
    );
    this.reservationRepository
      .createReservation(wishId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.reservationPendingWishIds.update((pendingIds) => {
            const updated = new Set(pendingIds);
            updated.delete(wishId);
            return updated;
          });
        }),
      )
      .subscribe({
        next: (reservation) => {
          this.wishes.update((wishes) =>
            wishes.map((wish) => {
              if (
                wish.id !== wishId ||
                wish.purchaseCoordination.kind !== "visible"
              ) {
                return wish;
              }

              return {
                ...wish,
                purchaseCoordination: { kind: "visible", reservation },
              };
            }),
          );
        },
        error: (error: unknown) => {
          const isConflict =
            error instanceof WishRepositoryError &&
            error.status === 409 &&
            error.code === "RESERVATION_ALREADY_EXISTS";
          this.reservationErrors.update((errors) =>
            new Map(errors).set(
              wishId,
              isConflict
                ? "Ce souhait vient d'être réservé par quelqu'un d'autre."
                : "La réservation a échoué. Réessayez.",
            ),
          );

          if (isConflict) {
            this.refresh();
          }
        },
      });
  }

  reservationContributorNames(reservation: ReservationSummary): string {
    const namesByParticipantId = new Map(
      this.participants().map((participant) => [
        participant.id,
        participant.name,
      ]),
    );

    return reservation.contributors
      .map(
        (contributor) =>
          namesByParticipantId.get(contributor.participantId) ?? "Quelqu'un",
      )
      .join(", ");
  }
}
