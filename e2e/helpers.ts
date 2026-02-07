import { Page, expect } from "@playwright/test";

/** Clear localStorage before a test to ensure isolation. */
export async function clearStorage(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
}

/** Create an exercise through the UI. */
export async function createExercise(
  page: Page,
  name: string,
  options?: { weight?: string; reps?: string; description?: string }
) {
  await page.goto("/exercise/create");
  await page.getByLabel("Name *").fill(name);

  if (options?.description) {
    await page.getByLabel("Description").fill(options.description);
  }
  if (options?.weight) {
    await page.getByLabel("Default Weight").fill(options.weight);
  }
  if (options?.reps) {
    await page.getByLabel("Default Reps").fill(options.reps);
  }

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL("/exercise");
}

/** Create a plan by selecting existing exercises from dropdown. */
export async function createPlan(
  page: Page,
  name: string,
  exerciseNames: string[]
) {
  await page.goto("/plan/create");
  await page.getByLabel("Plan Name").fill(name);

  for (const exerciseName of exerciseNames) {
    await page.getByRole("combobox", { name: /add exercise/i }).click();
    await page.getByRole("option", { name: new RegExp(exerciseName, "i") }).click();
  }

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/plan\/.+/);
  return page.url();
}
