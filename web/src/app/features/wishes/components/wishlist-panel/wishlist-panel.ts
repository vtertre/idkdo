import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from "@angular/core";
import type { OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  FormField,
  form,
  required,
  submit,
  validateStandardSchema,
} from "@angular/forms/signals";
import { createWishRequestBodySchema, type WishSummary } from "@idkdo/shared";
import { finalize } from "rxjs";

import { WishRepository } from "../../data-access/wish-repository";
import {
  WishlistItem,
  type WishlistItemDeleteRequest,
  type WishlistItemUpdateRequest,
} from "../wishlist-item/wishlist-item";

@Component({
  selector: "app-wishlist-panel",
  imports: [FormField, WishlistItem],
  templateUrl: "./wishlist-panel.html",
  styleUrl: "./wishlist-panel.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistPanel implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly repository = inject(WishRepository);

  readonly participantId = input.required<string>();

  protected readonly wishModel = signal({ content: "" });
  protected readonly wishForm = form(this.wishModel, (wish) => {
    required(wish.content, { message: "Saisissez un souhait." });
    validateStandardSchema(wish, createWishRequestBodySchema);
  });
  protected readonly wishes = signal<WishSummary[]>([]);
  protected readonly loadPending = signal(false);
  protected readonly createPending = signal(false);
  protected readonly mutatingWishId = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);
  protected readonly mutationError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadWishes();
  }

  protected loadWishes(): void {
    if (this.loadPending()) {
      return;
    }

    this.loadError.set(null);
    this.loadPending.set(true);

    this.repository
      .getParticipantWishes(this.participantId())
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
          this.loadError.set("La liste n’a pas pu être chargée. Réessayez.");
        },
      });
  }

  protected onCreateWish(event: SubmitEvent): void {
    event.preventDefault();

    if (this.createPending()) {
      return;
    }

    this.submitError.set(null);

    void submit(this.wishForm, (form) => {
      if (this.createPending()) {
        return Promise.resolve(undefined);
      }

      this.createPending.set(true);
      this.repository
        .createWish(this.participantId(), form().value().content)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.createPending.set(false);
          }),
        )
        .subscribe({
          next: (wish) => {
            this.wishes.update((currentWishes) => [...currentWishes, wish]);
            this.wishModel.set({ content: "" });
            this.wishForm().reset();
          },
          error: () => {
            this.submitError.set(
              "Le souhait n’a pas pu être ajouté. Réessayez.",
            );
          },
        });

      return Promise.resolve(undefined);
    });
  }

  protected onUpdateWish(request: WishlistItemUpdateRequest): void {
    if (this.mutatingWishId() !== null) {
      return;
    }

    this.mutationError.set(null);
    this.mutatingWishId.set(request.wishId);
    this.repository
      .updateWish(request.wishId, request.content)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.mutatingWishId.set(null);
        }),
      )
      .subscribe({
        next: (updatedWish) => {
          this.wishes.update((currentWishes) =>
            currentWishes.map((wish) =>
              wish.id === updatedWish.id ? updatedWish : wish,
            ),
          );
        },
        error: () => {
          this.mutationError.set(
            "Le souhait n'a pas pu être modifié. Réessayez.",
          );
        },
      });
  }

  protected onDeleteWish(request: WishlistItemDeleteRequest): void {
    if (this.mutatingWishId() !== null) {
      return;
    }

    this.mutationError.set(null);
    this.mutatingWishId.set(request.wishId);
    this.repository
      .deleteWish(request.wishId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.mutatingWishId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.wishes.update((currentWishes) =>
            currentWishes.filter((wish) => wish.id !== request.wishId),
          );
        },
        error: () => {
          this.mutationError.set(
            "Le souhait n'a pas pu être supprimé. Réessayez.",
          );
        },
      });
  }

  protected onWishItemCancelled(): void {
    this.mutationError.set(null);
  }
}
