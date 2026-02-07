import { test, expect } from "@playwright/test";
import { clearStorage, createExercise, createPlan } from "./helpers";

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

test.describe("Workout changes propagate to exercises and plans", () => {
  test("weight and reps changes during workout propagate to exercise and other plans", async ({
    page,
  }) => {
    // 1. Create an exercise
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });

    // 2. Add the exercise to two plans
    const planAUrl = await createPlan(page, "Push Day", ["Bench Press"]);
    const planBUrl = await createPlan(page, "Full Body", ["Bench Press"]);

    // 3. Start Plan A workout and modify weight and reps
    await page.goto(planAUrl);
    await page.getByRole("link", { name: /start/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);

    const row = page.locator("tbody tr").nth(0);
    const weightInput = row.getByRole("spinbutton").nth(0);
    const repsInput = row.getByRole("spinbutton").nth(1);

    // Verify initial values
    await expect(weightInput).toHaveValue("60");
    await expect(repsInput).toHaveValue("8");

    // Change weight 60 -> 75 and reps 8 -> 12
    await weightInput.fill("75");
    await repsInput.fill("12");

    // Complete the exercise and end workout
    await page
      .getByRole("checkbox", { name: /mark bench press as done/i })
      .check();
    await page.getByRole("button", { name: "End Workout" }).click();
    await expect(page).toHaveURL("/");

    // 4. Verify the change propagated to the exercise detail
    await page.goto("/exercise");
    await page.getByRole("link", { name: "Bench Press" }).click();
    await expect(page.getByText("75 kg")).toBeVisible();
    // Reps displayed under "Default Reps" heading
    const repsSection = page.locator("text=Default Reps").locator("..");
    await expect(repsSection.getByText("12")).toBeVisible();

    // 5. Verify Plan B also shows the updated values
    await page.goto(planBUrl);
    await expect(page.getByText("75 kg")).toBeVisible();

    // 6. Verify Plan B workout also starts with the new values
    await page.getByRole("link", { name: /start/i }).click();
    await expect(page).toHaveURL(/\/plan\/.+\/workout/);

    const planBRow = page.locator("tbody tr").nth(0);
    await expect(planBRow.getByRole("spinbutton").nth(0)).toHaveValue("75");
    await expect(planBRow.getByRole("spinbutton").nth(1)).toHaveValue("12");
  });
});
