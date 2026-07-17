import { expect, test } from "@playwright/test";

import {
  addWish,
  collectApiResponses,
  createEventThroughUi,
  joinAsParticipant,
  openAllLists,
  refreshAllLists,
  reserveWish,
  wishItemInGroup,
} from "./support/family.js";

type JsonRecord = Record<string, unknown>;

test("keeps purchase coordination hidden from the wisher in DOM, network, and writes", async ({
  browser,
  page,
}) => {
  const wishContent = `Secret vélo ${Date.now()}`;
  const { shareUrl } = await createEventThroughUi(page, `Anti-spoil ${Date.now()}`);
  const alice = await joinAsParticipant(browser, shareUrl, "Alice");
  const bob = await joinAsParticipant(browser, shareUrl, "Bob");
  const carol = await joinAsParticipant(browser, shareUrl, "Carol");
  const apiResponses = collectApiResponses(alice.page);

  const wishId = await createWishAndCaptureId(alice.page, wishContent);
  const reservationId = await reserveWish(bob.page, "Alice", wishContent);

  await refreshAllLists(carol.page);
  const carolWish = wishItemInGroup(carol.page, "Alice", wishContent);
  await carolWish.getByRole("button", { name: "Participer" }).click();
  await expect(carolWish.getByText("Bob")).toBeVisible();
  await expect(carolWish.getByText("Carol")).toBeVisible();

  await alice.page.reload();
  await expect(alice.page.getByRole("heading", { name: "Ma liste" })).toBeVisible();
  await openAllLists(alice.page);
  const aliceWish = wishItemInGroup(alice.page, "Alice", wishContent);
  await expect(aliceWish).toBeVisible();
  await expect(aliceWish.locator(".purchase-coordination")).toHaveCount(0);
  await expect
    .poll(() => aliceWish.textContent())
    .not.toContain("Bob");
  await expect
    .poll(() => aliceWish.textContent())
    .not.toContain("Carol");

  await expect
    .poll(() => apiResponses().length, { message: "Alice API responses collected" })
    .toBeGreaterThan(0);

  let hiddenCoordinationChecks = 0;
  for (const response of apiResponses()) {
    expect(response.bodyText).not.toContain(reservationId);
    const isEventWishes = /\/api\/events\/[^/]+\/wishes$/.test(
      new URL(response.url).pathname,
    );
    for (const wish of extractWishObjects(response.bodyText)) {
      if (wish["id"] === wishId || wish["wisherId"] === alice.participantId) {
        if (isEventWishes) {
          expect(wish["purchaseCoordination"]).toEqual({ kind: "hidden" });
          hiddenCoordinationChecks += 1;
        }
        const wishJson = JSON.stringify(wish);
        expect(wishJson).not.toContain(reservationId);
        expect(wishJson).not.toContain(bob.participantId);
        expect(wishJson).not.toContain(carol.participantId);
      }
    }
  }
  expect(hiddenCoordinationChecks).toBeGreaterThan(0);

  const selfReserve = await alice.page.request.post(`/api/wishes/${wishId}/reservation`, {
    headers: { "X-Participant-Id": alice.participantId },
    data: {},
  });
  expect(selfReserve.status()).toBe(422);

  const forbiddenContributor = await alice.page.request.post(
    `/api/reservations/${reservationId}/contributors`,
    {
      headers: { "X-Participant-Id": alice.participantId },
      data: { participantId: alice.participantId },
    },
  );
  expect(forbiddenContributor.status()).toBe(404);

  const randomContributor = await alice.page.request.post(
    "/api/reservations/00000000-0000-4000-8000-000000000000/contributors",
    {
      headers: { "X-Participant-Id": alice.participantId },
      data: { participantId: alice.participantId },
    },
  );
  expect(randomContributor.status()).toBe(404);
  expect(await forbiddenContributor.text()).toBe(await randomContributor.text());
});

async function createWishAndCaptureId(page: import("@playwright/test").Page, content: string): Promise<string> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/participants\/[^/]+\/wishes$/.test(new URL(response.url()).pathname),
  );
  await addWish(page, content);
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const body: unknown = await response.json();

  if (!isRecord(body) || typeof body["id"] !== "string") {
    throw new Error("Wish response did not include an id.");
  }

  return body["id"];
}

function extractWishObjects(bodyText: string): readonly JsonRecord[] {
  try {
    return findWishObjects(JSON.parse(bodyText));
  } catch {
    return [];
  }
}

function findWishObjects(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => findWishObjects(item));
  }

  if (!isRecord(value)) {
    return [];
  }

  const children = Object.values(value).flatMap((child) => findWishObjects(child));
  if (typeof value["id"] === "string" && typeof value["wisherId"] === "string") {
    return [value, ...children];
  }

  return children;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}
