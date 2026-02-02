import { test, expect } from "@playwright/test";
import { clearStorage } from "./helpers";

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

/** Helper: create a plan through the UI and return the detail page URL. */
async function createPlan(
  page: import("@playwright/test").Page,
  name: string,
  exercises: { name: string; weight: string; reps: string }[]
) {
  await page.goto("/plan/create");
  await page.getByLabel("Plan Name").fill(name);

  const rows = page.locator("tbody tr");

  for (let i = 0; i < exercises.length; i++) {
    if (i > 0) {
      await page.getByRole("button", { name: /add exercise/i }).click();
    }
    const row = rows.nth(i);
    await row.getByPlaceholder("Exercise name").fill(exercises[i].name);
    await row.getByRole("spinbutton").nth(0).fill(exercises[i].weight);
    await row.getByRole("spinbutton").nth(1).fill(exercises[i].reps);
  }

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/plan\/.+/);
  return page.url();
}

test.describe("View Plan", () => {
  test("plan detail page shows all exercise data", async ({ page }) => {
    await createPlan(page, "Leg Day", [
      { name: "Squat", weight: "80", reps: "5" },
      { name: "Leg Press", weight: "120", reps: "10" },
    ]);

    // Verify heading
    await expect(
      page.getByRole("heading", { name: "Leg Day" })
    ).toBeVisible();

    // Verify exercises
    await expect(page.getByText("Squat")).toBeVisible();
    await expect(page.getByText("80 kg")).toBeVisible();
    await expect(page.getByText("5", { exact: true })).toBeVisible();

    await expect(page.getByText("Leg Press")).toBeVisible();
    await expect(page.getByText("120 kg")).toBeVisible();
    await expect(page.getByText("10", { exact: true })).toBeVisible();
  });

  test("plan appears in home page list", async ({ page }) => {
    await createPlan(page, "Pull Day", [
      { name: "Deadlift", weight: "100", reps: "5" },
      { name: "Barbell Row", weight: "60", reps: "8" },
    ]);

    await page.goto("/");

    await expect(page.getByText("Pull Day")).toBeVisible();
    await expect(page.getByText("2 exercises")).toBeVisible();
  });

  test("plan detail has navigation buttons", async ({ page }) => {
    await createPlan(page, "Arms", [
      { name: "Curl", weight: "15", reps: "12" },
    ]);

    // "Start" links to workout page
    await expect(
      page.getByRole("link", { name: /start/i })
    ).toBeVisible();

    // "Edit" links to edit page
    await expect(
      page.getByRole("link", { name: /edit/i })
    ).toBeVisible();

    // Back button
    await expect(page.getByRole("button", { name: /back/i })).toBeVisible();
  });
});
