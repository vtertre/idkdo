export type InstantLike = {
  readonly epochMilliseconds: number;
};

export function instantToIsoString(instant: InstantLike): string {
  return new Date(instant.epochMilliseconds).toISOString();
}
