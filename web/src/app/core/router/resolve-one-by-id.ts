import type { ResolveFn } from "@angular/router";
import type { Observable } from "rxjs";

export function resolveOneById<T>(
  idKey: string,
  resolveFn: (id: string) => Observable<T>,
): ResolveFn<T> {
  return (route) => {
    const id = route.paramMap.get(idKey);
    if (!id) throw new Error(`Missing ${idKey}`);

    return resolveFn(id);
  };
}
