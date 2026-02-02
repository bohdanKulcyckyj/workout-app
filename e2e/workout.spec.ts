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

test.describe("Workout Tracking", () => {
  test("can start workout from plan detail", async ({ page }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
      { name: "Overhead Press", weight: "30", reps: "10" },
    ]);

    // Click "Start" link on detail page
    await page.getByRole("link", { name: /start/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);

    // Verify workout page shows plan name and exercises
    await expect(
      page.getByRole("heading", { name: "Push Day" })
    ).toBeVisible();
    await expect(page.getByText("Bench Press")).toBeVisible();
    await expect(page.getByText("Overhead Press")).toBeVisible();
  });

  test("can start workout from home page", async ({ page }) => {
    await createPlan(page, "Pull Day", [
      { name: "Deadlift", weight: "100", reps: "5" },
    ]);

    await page.goto("/");
    await expect(page.getByText("Pull Day")).toBeVisible();

    // Click the play button on the home list
    await page.getByRole("link", { name: /start/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);

    // Verify workout page loaded with exercises
    await expect(
      page.getByRole("heading", { name: "Pull Day" })
    ).toBeVisible();
    await expect(page.getByText("Deadlift")).toBeVisible();
  });

  test("can check off exercises", async ({ page }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
      { name: "Overhead Press", weight: "30", reps: "10" },
    ]);

    await page.getByRole("link", { name: /start/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);

    // Verify initial progress
    await expect(page.getByText("0 / 2 exercises done")).toBeVisible();

    // Check first exercise
    await page
      .getByRole("checkbox", { name: /mark bench press as done/i })
      .check();

    // Verify progress updated
    await expect(page.getByText("1 / 2 exercises done")).toBeVisible();

    // Verify the checked row has reduced opacity (visual update)
    const firstRow = page.locator("tbody tr").nth(0);
    await expect(firstRow).toHaveClass(/opacity-50/);
  });

  test("can modify weight and reps during workout", async ({ page }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
    ]);

    await page.getByRole("link", { name: /start/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);

    const row = page.locator("tbody tr").nth(0);

    // Change weight
    const weightInput = row.getByRole("spinbutton").nth(0);
    await weightInput.fill("65");
    await expect(weightInput).toHaveValue("65");

    // Change reps
    const repsInput = row.getByRole("spinbutton").nth(1);
    await repsInput.fill("10");
    await expect(repsInput).toHaveValue("10");
  });

  test("completing all exercises triggers confetti", async ({ page }) => {
    await createPlan(page, "Quick Workout", [
      { name: "Push-ups", weight: "0", reps: "20" },
    ]);

    await page.getByRole("link", { name: /start/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);

    // Spy on canvas-confetti by checking if a canvas element is created
    // canvas-confetti creates a <canvas> element when it fires
    const canvasCountBefore = await page.locator("canvas").count();

    // Check the only exercise to trigger confetti
    await page
      .getByRole("checkbox", { name: /mark push-ups as done/i })
      .check();

    // Verify progress shows all done
    await expect(page.getByText("1 / 1 exercises done")).toBeVisible();

    // canvas-confetti creates a canvas element — wait for it to appear
    await expect(page.locator("canvas")).toHaveCount(canvasCountBefore + 1, {
      timeout: 3000,
    });
  });

  test("end workout with all exercises complete", async ({ page }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
    ]);

    await page.getByRole("link", { name: /start/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);

    // Complete the exercise
    await page
      .getByRole("checkbox", { name: /mark bench press as done/i })
      .check();
    await expect(page.getByText("1 / 1 exercises done")).toBeVisible();

    // Click "End Workout" — no confirmation dialog since all are complete
    await page.getByRole("button", { name: "End Workout" }).click();

    // Should redirect to home
    await expect(page).toHaveURL("/");

    // Go back to workout to verify exercises reset to unchecked
    await page.getByRole("link", { name: /start/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);
    await expect(page.getByText("0 / 1 exercises done")).toBeVisible();
  });

  test("end workout with incomplete exercises shows confirmation", async ({
    page,
  }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
      { name: "Overhead Press", weight: "30", reps: "10" },
    ]);

    await page.getByRole("link", { name: /start/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);

    // Leave exercises unchecked, click "End Workout"
    await page.getByRole("button", { name: "End Workout" }).click();

    // Verify confirmation dialog appears
    await expect(page.getByText("End workout early?")).toBeVisible();
    await expect(
      page.getByText(/haven't completed all exercises/i)
    ).toBeVisible();

    // Confirm ending workout
    // The dialog has a second "End Workout" button
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "End Workout" })
      .click();

    // Should redirect to home
    await expect(page).toHaveURL("/");
  });

  test("can cancel end workout confirmation", async ({ page }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
    ]);

    await page.getByRole("link", { name: /start/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);

    // Leave exercises unchecked, click "End Workout"
    await page.getByRole("button", { name: "End Workout" }).click();

    // Verify dialog appears
    await expect(page.getByText("End workout early?")).toBeVisible();

    // Cancel the dialog
    await page.getByRole("button", { name: "Cancel" }).click();

    // Should still be on workout page
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);
    await expect(
      page.getByRole("heading", { name: "Push Day" })
    ).toBeVisible();
  });
});
