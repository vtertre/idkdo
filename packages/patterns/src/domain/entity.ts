export interface Entity<TId> {
  readonly id: TId;
  equals(other: unknown): boolean;
}
