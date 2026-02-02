import { Page } from "@playwright/test";

/** Clear localStorage before a test to ensure isolation. */
export async function clearStorage(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
}
