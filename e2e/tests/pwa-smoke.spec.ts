import { expect, test } from "@playwright/test";

import { addWish, createEventThroughUi, joinAsParticipant } from "./support/family.js";

test("serves an installable production PWA shell without caching API responses", async ({
  browser,
  context,
  page,
}) => {
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(200);
  const manifest: unknown = await manifestResponse.json();
  expect(isRecord(manifest) && typeof manifest["name"] === "string").toBe(true);
  expect(isRecord(manifest) && typeof manifest["display"] === "string").toBe(true);
  expect(isRecord(manifest) && Array.isArray(manifest["icons"])).toBe(true);
  expect(
    isRecord(manifest) &&
      Array.isArray(manifest["icons"]) &&
      manifest["icons"].length > 0,
  ).toBe(true);

  const indexResponse = await page.request.get("/");
  expect(await indexResponse.text()).toContain("manifest.webmanifest");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Créer un événement" })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const names = await caches.keys();
        return names.filter((name) => name.startsWith("ngsw:"));
      }),
    )
    .not.toEqual([]);

  const { shareUrl } = await createEventThroughUi(page, `PWA ${Date.now()}`);
  const participant = await joinAsParticipant(browser, shareUrl, "Alice");
  await addWish(participant.page, `Livre PWA ${Date.now()}`);
  await expectNoHorizontalScroll(participant.page);

  const cachedUrls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        urls.push(request.url);
      }
    }
    return urls;
  });
  expect(cachedUrls.some((url) => new URL(url).pathname.startsWith("/api/"))).toBe(false);
  expect(cachedUrls.some((url) => /\.(?:js|css)$/.test(new URL(url).pathname))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading")).toBeVisible();
  await context.setOffline(false);
});

async function expectNoHorizontalScroll(page: import("@playwright/test").Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      })),
    )
    .toEqual({ scrollWidth: 390, viewportWidth: 390 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
