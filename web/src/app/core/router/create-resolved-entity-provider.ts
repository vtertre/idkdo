import { inject, signal } from "@angular/core";
import type { WritableSignal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { createInjectable } from "@signality/core";

export function createResolvedEntityProvider<T>(name: string) {
  type Entity = WritableSignal<T>;

  return createInjectable(entityDescription(name), (): Entity => {
    const data = inject(ActivatedRoute).snapshot.data;
    if (name in data) return signal(data[name] as T);

    throw new Error(
      `Missing "${name}" in route data. Did you forget to add the resolver?`,
    );
  });
}

function entityDescription(name: string): string {
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}ResolvedEntity`;
}
