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

test.describe("Edit Plan", () => {
  test("can navigate to edit page from plan detail", async ({ page }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
      { name: "Overhead Press", weight: "30", reps: "10" },
    ]);

    // Click "Edit" link on detail page
    await page.getByRole("link", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/edit/);

    // Verify form is pre-filled with existing data
    await expect(page.getByLabel("Plan Name")).toHaveValue("Push Day");

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    await expect(
      rows.nth(0).getByPlaceholder("Exercise name")
    ).toHaveValue("Bench Press");
    await expect(rows.nth(0).getByRole("spinbutton").nth(0)).toHaveValue("60");
    await expect(rows.nth(0).getByRole("spinbutton").nth(1)).toHaveValue("8");

    await expect(
      rows.nth(1).getByPlaceholder("Exercise name")
    ).toHaveValue("Overhead Press");
    await expect(rows.nth(1).getByRole("spinbutton").nth(0)).toHaveValue("30");
    await expect(rows.nth(1).getByRole("spinbutton").nth(1)).toHaveValue("10");
  });

  test("can edit plan name", async ({ page }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
    ]);

    await page.getByRole("link", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/edit/);

    // Change plan name
    await page.getByLabel("Plan Name").fill("Pull Day");

    // Save
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Should redirect to detail page with updated name
    await expect(page).toHaveURL(/\/plan\/.+(?!\/edit)/);
    await expect(
      page.getByRole("heading", { name: "Pull Day" })
    ).toBeVisible();
  });

  test("can edit exercise details", async ({ page }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
      { name: "Overhead Press", weight: "30", reps: "10" },
    ]);

    await page.getByRole("link", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/edit/);

    const rows = page.locator("tbody tr");

    // Modify first exercise
    await rows.nth(0).getByPlaceholder("Exercise name").fill("Incline Bench");
    await rows.nth(0).getByRole("spinbutton").nth(0).fill("50");
    await rows.nth(0).getByRole("spinbutton").nth(1).fill("12");

    // Save
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Verify changes on detail page
    await expect(page.getByText("Incline Bench")).toBeVisible();
    await expect(page.getByText("50 kg")).toBeVisible();
    await expect(page.getByText("12", { exact: true })).toBeVisible();

    // Original second exercise still present
    await expect(page.getByText("Overhead Press")).toBeVisible();
  });

  test("can add exercises during edit", async ({ page }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
    ]);

    await page.getByRole("link", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/edit/);

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(1);

    // Add a new exercise
    await page.getByRole("button", { name: /add exercise/i }).click();
    await expect(rows).toHaveCount(2);

    // Fill in new exercise
    const newRow = rows.nth(1);
    await newRow.getByPlaceholder("Exercise name").fill("Tricep Dips");
    await newRow.getByRole("spinbutton").nth(0).fill("0");
    await newRow.getByRole("spinbutton").nth(1).fill("15");

    // Save
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Verify new exercise appears on detail page
    await expect(page.getByText("Bench Press")).toBeVisible();
    await expect(page.getByText("Tricep Dips")).toBeVisible();
    await expect(page.getByText("15", { exact: true })).toBeVisible();
  });

  test("can remove exercises during edit", async ({ page }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
      { name: "Overhead Press", weight: "30", reps: "10" },
    ]);

    await page.getByRole("link", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/edit/);

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    // Remove the first exercise (Bench Press)
    await page
      .getByRole("button", { name: /remove exercise/i })
      .first()
      .click();
    await expect(rows).toHaveCount(1);

    // Save
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Verify only the remaining exercise is on detail page
    await expect(page.getByText("Overhead Press")).toBeVisible();
    await expect(page.getByText("Bench Press")).not.toBeVisible();
  });
});
