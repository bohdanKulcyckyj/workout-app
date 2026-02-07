import { test, expect } from "@playwright/test";
import { clearStorage, createExercise, createPlan } from "./helpers";

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

test.describe("Edit Plan", () => {
  test("can navigate to edit page from plan detail", async ({ page }) => {
    // Create exercises first
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createExercise(page, "Overhead Press", { weight: "30", reps: "10" });

    // Create plan using dropdown
    await createPlan(page, "Push Day", ["Bench Press", "Overhead Press"]);

    // Click "Edit" link on detail page
    await page.getByRole("link", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/edit/);

    // Verify form is pre-filled with existing data
    await expect(page.getByLabel("Plan Name")).toHaveValue("Push Day");

    // Verify exercises are displayed in table (read-only)
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(page.getByText("Bench Press")).toBeVisible();
    await expect(page.getByText("Overhead Press")).toBeVisible();
  });

  test("can edit plan name", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createPlan(page, "Push Day", ["Bench Press"]);

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

  test("can add exercises during edit", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createExercise(page, "Tricep Dips", { weight: "0", reps: "15" });
    await createPlan(page, "Push Day", ["Bench Press"]);

    await page.getByRole("link", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/edit/);

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(1);

    // Add a new exercise via dropdown
    await page.getByRole("combobox", { name: /add exercise/i }).click();
    await page.getByRole("option", { name: /Tricep Dips/i }).click();
    await expect(rows).toHaveCount(2);

    // Save
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Verify new exercise appears on detail page
    await expect(page.getByText("Bench Press")).toBeVisible();
    await expect(page.getByText("Tricep Dips")).toBeVisible();
    await expect(page.getByText("15", { exact: true })).toBeVisible();
  });

  test("can remove exercises during edit", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createExercise(page, "Overhead Press", { weight: "30", reps: "10" });
    await createPlan(page, "Push Day", ["Bench Press", "Overhead Press"]);

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

  test("can create new exercise via modal during edit", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createPlan(page, "Push Day", ["Bench Press"]);

    await page.getByRole("link", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/edit/);

    // Click combobox and create new exercise
    await page.getByRole("combobox", { name: /add exercise/i }).click();
    await page.getByRole("option", { name: /Create new exercise/i }).click();

    // Fill modal form
    await page.getByLabel("Name *").fill("Dumbbell Flies");
    await page.getByLabel("Default Weight").fill("15");
    await page.getByLabel("Default Reps").fill("12");
    await page.getByRole("button", { name: "Create" }).click();

    // Verify new exercise added to table
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(page.getByText("Dumbbell Flies")).toBeVisible();

    // Save
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Verify on detail page
    await expect(page.getByText("Bench Press")).toBeVisible();
    await expect(page.getByText("Dumbbell Flies")).toBeVisible();
  });
});
