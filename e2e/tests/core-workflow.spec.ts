import { expect, test } from "@playwright/test";

import {
  addWish,
  createEventThroughUi,
  joinAsParticipant,
  openAllLists,
  refreshAllLists,
  reserveWish,
  wishItemInGroup,
} from "./support/family.js";

test("creates an event, manages wishes, reserves, and survives reload", async ({
  browser,
  page,
}, testInfo) => {
  const eventName = `Noël 2026 ${testInfo.project.name} ${Date.now()}`;
  const initialWish = "Train rouge\nhttps://example.com/train-rouge";
  const editedWish = "Camion bleu\nhttps://example.com/camion-bleu";
  const secondWish = "Puzzle de voyage";

  const { shareUrl } = await createEventThroughUi(page, eventName);
  await expect(page.getByRole("heading", { name: "Ajouter votre nom" })).toBeVisible();

  const alice = await joinAsParticipant(browser, shareUrl, "Alice");
  const bob = await joinAsParticipant(browser, shareUrl, "Bob");

  await addWish(alice.page, initialWish);
  await expect(alice.page.getByRole("link", { name: "https://example.com/train-rouge" })).toHaveAttribute(
    "href",
    "https://example.com/train-rouge",
  );

  await alice.page.getByRole("button", { name: "Modifier" }).click();
  await alice.page.getByLabel("Modifier le souhait").fill(editedWish);
  await alice.page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(alice.page.getByText(editedWish)).toBeVisible();
  await expect(alice.page.getByText(initialWish)).toBeHidden();

  await addWish(alice.page, secondWish);
  await alice.page
    .locator(".wishlist-item", { hasText: secondWish })
    .getByRole("button", { name: "Supprimer" })
    .click();
  await alice.page.getByRole("button", { name: "Confirmer" }).click();
  await expect(alice.page.getByText(secondWish)).toBeHidden();

  await refreshAllLists(bob.page);
  await expect(wishItemInGroup(bob.page, "Alice", editedWish)).toBeVisible();
  await expect(wishItemInGroup(bob.page, "Alice", editedWish).getByRole("button", { name: "Réserver" })).toBeVisible();
  await expect(bob.page.locator(".wish-group", { hasText: "Bob" }).getByText("vous")).toBeVisible();

  const bobOwnListTab = bob.page.getByRole("tab", { name: "Ma liste" });
  if (await bobOwnListTab.isVisible()) {
    await bobOwnListTab.click();
  }
  const bobWish = "Écharpe grise";
  await addWish(bob.page, bobWish);

  await reserveWish(bob.page, "Alice", editedWish);
  await expect(wishItemInGroup(bob.page, "Alice", editedWish).getByText("Bob")).toBeVisible();

  await bob.page.reload();
  await refreshAllLists(bob.page);
  await expect(wishItemInGroup(bob.page, "Alice", editedWish).getByText("Réservé par")).toBeVisible();
  await expect(wishItemInGroup(bob.page, "Alice", editedWish).getByText("Bob")).toBeVisible();

  await alice.page.reload();
  await expect(alice.page.getByRole("heading", { name: "Ma liste" })).toBeVisible();
  await expect(alice.page.locator("#my-list-panel").getByText(editedWish)).toBeVisible();
  await openAllLists(alice.page);
  const aliceOwnWish = wishItemInGroup(alice.page, "Alice", editedWish);
  await expect(aliceOwnWish.locator(".purchase-coordination")).toHaveCount(0);
  // Positive control (FE-22).
  const aliceViewOfBobWish = wishItemInGroup(alice.page, "Bob", bobWish);
  await expect(aliceViewOfBobWish).toBeVisible();
  await expect(
    aliceViewOfBobWish.locator(".purchase-coordination"),
  ).toHaveCount(1);
  await expect
    .poll(() => aliceOwnWish.textContent())
    .not.toContain("Bob");
});
