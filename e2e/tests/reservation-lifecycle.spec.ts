import { expect, test } from "@playwright/test";

import {
  addWish,
  createEventThroughUi,
  joinAsParticipant,
  refreshAllLists,
  reserveWish,
  wishItemInGroup,
} from "./support/family.js";

test("runs the reservation contributor lifecycle through the browser", async ({
  browser,
  page,
}) => {
  const wishContent = `Appareil photo ${Date.now()}`;
  const { shareUrl } = await createEventThroughUi(page, `Lifecycle ${Date.now()}`);
  const alice = await joinAsParticipant(browser, shareUrl, "Alice");
  const bob = await joinAsParticipant(browser, shareUrl, "Bob");
  const carol = await joinAsParticipant(browser, shareUrl, "Carol");
  await joinAsParticipant(browser, shareUrl, "Dave");
  await carol.page.reload();
  await expect(carol.page.getByRole("heading", { name: "Ma liste" })).toBeVisible();

  await addWish(alice.page, wishContent);
  await reserveWish(bob.page, "Alice", wishContent);

  await refreshAllLists(carol.page);
  const carolWish = wishItemInGroup(carol.page, "Alice", wishContent);
  await carolWish.getByRole("button", { name: "Participer" }).click();
  await expect(carolWish.getByText("Bob")).toBeVisible();
  await expect(carolWish.getByText("Carol")).toBeVisible();

  await carolWish.getByRole("button", { name: "Ajouter quelqu'un" }).click();
  const picker = carolWish.getByLabel("Ajouter quelqu'un");
  await expect(picker).not.toContainText("Alice");
  await expect(picker).not.toContainText("Bob");
  await expect(picker).not.toContainText("Carol");
  await expect(picker).toContainText("Dave");
  await picker.selectOption({ label: "Dave" });
  await carolWish.getByRole("button", { name: "Ajouter" }).click();
  await expect(carolWish.getByText("Dave")).toBeVisible();

  await bob.page.reload();
  await expect(bob.page.getByRole("heading", { name: "Ma liste" })).toBeVisible();
  await refreshAllLists(bob.page);
  const bobWish = wishItemInGroup(bob.page, "Alice", wishContent);
  await expect(bobWish.getByText("Bob")).toBeVisible();
  await expect(bobWish.getByText("Carol")).toBeVisible();
  await expect(bobWish.getByText("Dave")).toBeVisible();

  await carolWish.locator(".contributor", { hasText: "Dave" }).getByRole("button", { name: "Retirer" }).click();
  await expect(carolWish.getByText("Dave")).toBeHidden();
  await carolWish.getByRole("button", { name: "Ne plus participer" }).click();
  await expect(carolWish.getByText("Carol")).toBeHidden();

  await refreshAllLists(bob.page);
  await bobWish.getByRole("button", { name: "Ne plus participer" }).click();

  await carol.page.reload();
  await refreshAllLists(carol.page);
  const resetWish = wishItemInGroup(carol.page, "Alice", wishContent);
  await expect(resetWish.getByRole("button", { name: "Réserver" })).toBeVisible();
  await reserveWish(carol.page, "Alice", wishContent);
  await expect(resetWish.getByText("Carol")).toBeVisible();
});
