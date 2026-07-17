import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export type EventFixture = {
  readonly eventId: string;
  readonly shareUrl: string;
};

export type ParticipantSession = {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly participantId: string;
};

export type ApiResponseRecord = {
  readonly url: string;
  readonly status: number;
  readonly bodyText: string;
};

export async function createEventThroughUi(
  page: Page,
  name: string,
): Promise<EventFixture> {
  await page.goto("/");
  await page.getByLabel("Nom de l’événement").fill(name);
  await page.getByRole("button", { name: "Créer l’événement" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  const shareLink = page.getByRole("link", { name: /\/events\// });
  await expect(shareLink).toBeVisible();
  const shareUrl = await shareLink.getAttribute("href");
  expect(shareUrl).not.toBeNull();

  const eventId = new URL(shareUrl ?? "").pathname.split("/").filter(Boolean).at(1);
  expect(eventId).toMatch(uuidPattern);

  return { eventId: eventId ?? "", shareUrl: shareUrl ?? "" };
}

export async function joinAsParticipant(
  browser: Browser,
  shareUrl: string,
  participantName: string,
): Promise<ParticipantSession> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(shareUrl);
  await expect(page.getByRole("heading", { name: "Ajouter votre nom" })).toBeVisible();
  await page.getByLabel("Nom du participant").fill(participantName);
  await page.getByRole("button", { name: "Me joindre" }).click();
  await expect(page.getByRole("heading", { name: "Ma liste" })).toBeVisible();

  const eventId = new URL(page.url()).pathname.split("/").filter(Boolean).at(1);
  expect(eventId).toMatch(uuidPattern);
  const participantId = await selectedParticipantId(page, eventId ?? "");

  return { context, page, participantId };
}

export function collectApiResponses(
  page: Page,
): () => readonly ApiResponseRecord[] {
  const records: ApiResponseRecord[] = [];

  page.on("response", (response) => {
    const url = response.url();
    if (!new URL(url).pathname.startsWith("/api/")) {
      return;
    }

    void response.text().then(
      (bodyText) => {
        records.push({ url, status: response.status(), bodyText });
      },
      () => {
        records.push({ url, status: response.status(), bodyText: "" });
      },
    );
  });

  return () => records;
}

export async function selectedParticipantId(
  page: Page,
  eventId: string,
): Promise<string> {
  const value = await page.evaluate<string | null, string>(
    (id) => window.localStorage.getItem(`idkdo:event:${id}:selectedParticipantId`),
    eventId,
  );

  expect(value).toMatch(uuidPattern);
  return value ?? "";
}

export async function openAllLists(page: Page): Promise<void> {
  const allListsTab = page.getByRole("tab", { name: "Toutes les listes" });
  if (await allListsTab.isVisible()) {
    await allListsTab.click();
  }
  await expect(page.getByRole("tabpanel", { name: "Toutes les listes" })).toBeVisible();
}

export async function refreshAllLists(page: Page): Promise<void> {
  await openAllLists(page);
  await page.getByRole("button", { name: "Actualiser" }).click();
}

export function participantGroup(page: Page, name: string) {
  return page.locator(".wish-group").filter({
    has: page.getByRole("heading", { name: new RegExp(`^${escapeRegExp(name)}(?:\\s+vous)?$`) }),
  });
}

export function wishItemInGroup(page: Page, participantName: string, content: string) {
  return participantGroup(page, participantName).locator(".event-wish", {
    hasText: content,
  });
}

export async function addWish(page: Page, content: string): Promise<void> {
  await page.getByLabel("Ajouter un souhait").fill(content);
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByText(content)).toBeVisible();
}

export async function reserveWish(
  page: Page,
  participantName: string,
  content: string,
): Promise<string> {
  await refreshAllLists(page);
  const wish = wishItemInGroup(page, participantName, content);
  await expect(wish).toBeVisible();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/reservation"),
  );
  await wish.getByRole("button", { name: "Réserver" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const body: unknown = await response.json();

  if (!isRecord(body) || typeof body["id"] !== "string") {
    throw new Error("Reservation response did not include an id.");
  }

  await expect(wish.getByText("Réservé par")).toBeVisible();
  return body["id"];
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
