export function canViewPurchaseCoordination(
  viewerParticipantId: string,
  wisherId: string,
): boolean {
  return viewerParticipantId !== wisherId;
}
