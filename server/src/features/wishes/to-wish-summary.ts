import { wishes } from "@idkdo/db";
import type { WishSummary } from "@idkdo/shared";

type WishRow = typeof wishes.$inferSelect;

export function toWishSummary(row: WishRow): WishSummary {
  return {
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    eventId: row.eventId,
    id: row.id,
    updatedAt: row.updatedAt.toISOString(),
    wisherId: row.wisherId,
  };
}
