import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

import { segmentWishContent } from "./segment-wish-content";

@Component({
  selector: "app-wish-content",
  templateUrl: "./wish-content.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishContent {
  readonly content = input.required<string>();

  protected readonly segments = computed(() => segmentWishContent(this.content()));
}
