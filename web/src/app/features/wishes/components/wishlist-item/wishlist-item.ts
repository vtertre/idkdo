import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
} from "@angular/core";
import {
  FormField,
  form,
  required,
  submit,
  validateStandardSchema,
} from "@angular/forms/signals";
import { updateWishRequestBodySchema, type WishSummary } from "@idkdo/shared";

import { WishContent } from "../wish-content/wish-content";

type WishlistItemMode = "display" | "editing" | "confirming-delete";

export type WishlistItemUpdateRequest = {
  readonly content: string;
  readonly wishId: string;
};

export type WishlistItemDeleteRequest = {
  readonly wishId: string;
};

@Component({
  selector: "app-wishlist-item",
  imports: [FormField, WishContent],
  templateUrl: "./wishlist-item.html",
  styleUrl: "./wishlist-item.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistItem {
  readonly wish = input.required<WishSummary>();
  readonly busy = input(false);
  readonly updateRequested = output<WishlistItemUpdateRequest>();
  readonly deleteRequested = output<WishlistItemDeleteRequest>();
  readonly cancelled = output<void>();

  protected readonly mode = linkedSignal<WishSummary, WishlistItemMode>({
    source: this.wish,
    computation: () => "display",
  });
  protected readonly draft = linkedSignal({
    source: this.wish,
    computation: (wish) => ({ content: wish.content }),
  });
  protected readonly wishForm = form(this.draft, (wish) => {
    required(wish.content, { message: "Saisissez un souhait." });
    validateStandardSchema(wish, updateWishRequestBodySchema);
  });

  protected startEditing(): void {
    if (this.busy()) {
      return;
    }

    this.draft.set({ content: this.wish().content });
    this.mode.set("editing");
  }

  protected cancelEditing(): void {
    this.draft.set({ content: this.wish().content });
    this.wishForm().reset();
    this.mode.set("display");
    this.cancelled.emit();
  }

  protected startDeleteConfirmation(): void {
    if (this.busy()) {
      return;
    }

    this.mode.set("confirming-delete");
  }

  protected cancelDeleteConfirmation(): void {
    this.mode.set("display");
    this.cancelled.emit();
  }

  protected confirmDelete(): void {
    if (this.busy()) {
      return;
    }

    this.deleteRequested.emit({ wishId: this.wish().id });
  }

  protected onSubmitUpdate(event: SubmitEvent): void {
    event.preventDefault();

    if (this.busy()) {
      return;
    }

    void submit(this.wishForm, (form) => {
      if (this.busy() || form().invalid()) {
        return Promise.resolve(undefined);
      }

      const content = form().value().content;
      if (content === this.wish().content) {
        this.mode.set("display");
        return Promise.resolve(undefined);
      }

      this.updateRequested.emit({
        content,
        wishId: this.wish().id,
      });

      return Promise.resolve(undefined);
    });
  }
}
