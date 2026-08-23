import { test, expect } from "@playwright/test";
import { resetAndLogin, createExercise, createPlan } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetAndLogin(page);
});

test.describe("Exercise Cascade Deletion", () => {
  test("deleting exercise removes it from a plan", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createExercise(page, "Overhead Press", { weight: "30", reps: "10" });
    const planUrl = await createPlan(page, "Push Day", [
      "Bench Press",
      "Overhead Press",
    ]);

    // Delete Bench Press from exercise list
    await page.goto("/exercise");
    // There are 2 exercises, find the right menu button
    const benchRow = page.getByRole("row").filter({ hasText: "Bench Press" });
    await benchRow.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    // Verify Bench Press gone from exercise list
    await expect(page.getByText("Bench Press")).not.toBeVisible();
    await expect(page.getByText("Overhead Press")).toBeVisible();

    // Navigate to plan detail - should only show Overhead Press
    await page.goto(planUrl);
    await expect(page.getByText("Overhead Press")).toBeVisible();
    await expect(page.getByText("Bench Press")).not.toBeVisible();
  });

  test("deleting exercise removes it from multiple plans", async ({
    page,
  }) => {
    await createExercise(page, "Squat", { weight: "100", reps: "5" });
    await createExercise(page, "Leg Press", { weight: "120", reps: "10" });
    const plan1Url = await createPlan(page, "Leg Day A", [
      "Squat",
      "Leg Press",
    ]);
    const plan2Url = await createPlan(page, "Leg Day B", ["Squat"]);

    // Delete Squat
    await page.goto("/exercise");
    const squatRow = page.getByRole("row").filter({ hasText: "Squat" });
    await squatRow.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    // Verify plan 1 only has Leg Press
    await page.goto(plan1Url);
    await expect(page.getByText("Leg Press")).toBeVisible();
    await expect(page.getByText("Squat")).not.toBeVisible();

    // Verify plan 2 has no exercises
    await page.goto(plan2Url);
    await expect(page.getByText("Squat")).not.toBeVisible();
  });

  test("detail page delete dialog shows plan count", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createPlan(page, "Push Day", ["Bench Press"]);
    await createPlan(page, "Upper Body", ["Bench Press"]);

    // Go to exercise detail
    await page.goto("/exercise");
    await page.getByRole("link", { name: "Bench Press" }).click();

    // Shows "Used in Plans" section
    await expect(page.getByText("Used in Plans")).toBeVisible();
    await expect(page.getByText("Push Day")).toBeVisible();
    await expect(page.getByText("Upper Body")).toBeVisible();

    // Open delete dialog - should mention 2 plans
    await page.getByRole("button", { name: /delete/i }).click();
    await expect(page.getByText(/2 workout plans/i)).toBeVisible();
  });

  test("detail page delete dialog shows singular plan count", async ({
    page,
  }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createPlan(page, "Push Day", ["Bench Press"]);

    await page.goto("/exercise");
    await page.getByRole("link", { name: "Bench Press" }).click();

    await page.getByRole("button", { name: /delete/i }).click();
    await expect(page.getByText(/1 workout plan\b/)).toBeVisible();
  });

  test("plans still exist after their exercise is deleted", async ({
    page,
  }) => {
    await createExercise(page, "Curl", { weight: "15", reps: "12" });
    await createPlan(page, "Arms Day", ["Curl"]);

    // Delete the exercise
    await page.goto("/exercise");
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    // Plan should still exist on home page
    await page.goto("/");
    await expect(page.getByText("Arms Day")).toBeVisible();
  });

  test("used in plans section links to plan detail", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createPlan(page, "Push Day", ["Bench Press"]);

    // Go to exercise detail
    await page.goto("/exercise");
    await page.getByRole("link", { name: "Bench Press" }).click();

    // Click plan link in "Used in Plans"
    await page.getByRole("link", { name: "Push Day" }).click();

    // Should be on plan detail page
    await expect(page).toHaveURL(/\/plan\/.+/);
    await expect(
      page.getByRole("heading", { name: "Push Day" })
    ).toBeVisible();
  });
});
