import { test, expect } from "@playwright/test";
import { clearStorage, createExercise } from "./helpers";

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

test.describe("Create Plan", () => {
  test("empty state shows prompt to create plan", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("No workout plans yet")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /create your first plan/i })
    ).toBeVisible();
  });

  test("can create a plan with exercises", async ({ page }) => {
    // First create some exercises to select from
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createExercise(page, "Overhead Press", { weight: "30", reps: "10" });

    await page.goto("/plan/create");

    // Fill plan name
    await page.getByLabel("Plan Name").fill("Push Day");

    // Open exercise selector and add Bench Press
    await page.getByRole("combobox", { name: /add exercise/i }).click();
    await page.getByRole("option", { name: /Bench Press/i }).click();

    // Open exercise selector and add Overhead Press
    await page.getByRole("combobox", { name: /add exercise/i }).click();
    await page.getByRole("option", { name: /Overhead Press/i }).click();

    // Verify exercises are in the table
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    // Submit form
    await page.getByRole("button", { name: "Create" }).click();

    // Should redirect to plan detail page
    await expect(page).toHaveURL(/\/plan\/.+/);
    await expect(page.getByRole("heading", { name: "Push Day" })).toBeVisible();

    // Verify exercises displayed
    await expect(page.getByText("Bench Press")).toBeVisible();
    await expect(page.getByText("Overhead Press")).toBeVisible();
    await expect(page.getByText("60 kg")).toBeVisible();
    await expect(page.getByText("30 kg")).toBeVisible();
  });

  test("can create exercise via modal and add to plan", async ({ page }) => {
    await page.goto("/plan/create");

    // Fill plan name
    await page.getByLabel("Plan Name").fill("New Plan");

    // Open exercise selector and click "Create new exercise"
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: /Create new exercise/i }).click();

    // Fill exercise form in modal
    await page.getByLabel("Name *").fill("Squats");
    await page.getByLabel("Default Weight").fill("80");
    await page.getByLabel("Default Reps").fill("10");

    // Submit modal form
    await page.getByRole("button", { name: "Create" }).click();

    // Verify exercise is added to plan
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(page.getByText("Squats")).toBeVisible();

    // Submit plan form
    await page.getByRole("button", { name: "Create" }).click();

    // Should redirect to plan detail page
    await expect(page).toHaveURL(/\/plan\/.+/);
    await expect(page.getByText("Squats")).toBeVisible();
    await expect(page.getByText("80 kg")).toBeVisible();
  });

  test("can add and remove exercises", async ({ page }) => {
    // Create exercises first
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createExercise(page, "Overhead Press", { weight: "30", reps: "10" });

    await page.goto("/plan/create");

    // Initially no exercises (empty state message shown)
    await expect(page.getByText("No exercises added yet")).toBeVisible();

    // Add first exercise
    await page.getByRole("combobox", { name: /add exercise/i }).click();
    await page.getByRole("option", { name: /Bench Press/i }).click();

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(1);

    // Add second exercise
    await page.getByRole("combobox", { name: /add exercise/i }).click();
    await page.getByRole("option", { name: /Overhead Press/i }).click();
    await expect(rows).toHaveCount(2);

    // Remove the first exercise
    await page
      .getByRole("button", { name: /remove exercise/i })
      .first()
      .click();
    await expect(rows).toHaveCount(1);

    // Verify only Overhead Press remains
    await expect(page.getByText("Overhead Press")).toBeVisible();
    await expect(page.getByText("Bench Press")).not.toBeVisible();
  });

  test("already added exercises are filtered from dropdown", async ({ page }) => {
    // Create exercises first
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createExercise(page, "Overhead Press", { weight: "30", reps: "10" });

    await page.goto("/plan/create");

    // Add Bench Press
    await page.getByRole("combobox", { name: /add exercise/i }).click();
    await expect(page.getByRole("option", { name: /Bench Press/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Overhead Press/i })).toBeVisible();
    await page.getByRole("option", { name: /Bench Press/i }).click();

    // Open dropdown again - Bench Press should not be available
    await page.getByRole("combobox", { name: /add exercise/i }).click();
    await expect(page.getByRole("option", { name: /Bench Press/i })).not.toBeVisible();
    await expect(page.getByRole("option", { name: /Overhead Press/i })).toBeVisible();
  });
});
