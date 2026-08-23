import { test, expect } from "@playwright/test";
import { resetAndLogin, createExercise, createPlan } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetAndLogin(page);
});

test.describe("Exercise Edge Cases", () => {
  test("exercise with special characters in name", async ({ page }) => {
    await createExercise(page, "Barbell Curl (EZ-Bar)", {
      weight: "25",
      reps: "12",
    });

    await page.goto("/exercise");
    await expect(page.getByText("Barbell Curl (EZ-Bar)")).toBeVisible();

    // Navigate to detail and verify
    await page.getByRole("link", { name: "Barbell Curl (EZ-Bar)" }).click();
    await expect(
      page.getByRole("heading", { name: "Barbell Curl (EZ-Bar)" })
    ).toBeVisible();
  });

  test("exercise with decimal weight", async ({ page }) => {
    await createExercise(page, "Dumbbell Fly", {
      weight: "12.5",
      reps: "10",
    });

    await page.goto("/exercise");
    await expect(page.getByText("12.5 kg")).toBeVisible();

    // Verify in detail page too
    await page.getByRole("link", { name: "Dumbbell Fly" }).click();
    await expect(page.getByText("12.5 kg")).toBeVisible();
  });

  test("editing exercise updates it in plan detail", async ({ page }) => {
    await createExercise(page, "Squat", { weight: "80", reps: "5" });
    const planUrl = await createPlan(page, "Leg Day", ["Squat"]);

    // Edit the exercise
    await page.goto("/exercise");
    await page.getByRole("link", { name: "Squat" }).click();
    await page.getByRole("link", { name: /edit/i }).click();

    await page.getByLabel("Name *").fill("Back Squat");
    await page.getByLabel("Default Weight").fill("100");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Verify plan detail shows updated exercise data
    await page.goto(planUrl);
    await expect(page.getByText("Back Squat")).toBeVisible();
    await expect(page.getByText("100 kg")).toBeVisible();
  });

  test("editing exercise updates it in workout page", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    const planUrl = await createPlan(page, "Push Day", ["Bench Press"]);

    // Edit exercise weight
    await page.goto("/exercise");
    await page.getByRole("link", { name: "Bench Press" }).click();
    await page.getByRole("link", { name: /edit/i }).click();

    await page.getByLabel("Default Weight").fill("70");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Start workout and verify updated weight
    await page.goto(planUrl);
    await page.getByRole("link", { name: /start/i }).click();
    await expect(page.getByRole("spinbutton").first()).toHaveValue("70");
  });

  test("exercise not used by any plan has no Used in Plans section", async ({
    page,
  }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });

    await page.goto("/exercise");
    await page.getByRole("link", { name: "Bench Press" }).click();

    // Should not show "Used in Plans" section
    await expect(page.getByText("Used in Plans")).not.toBeVisible();
  });

  test("data persists after page reload", async ({ page }) => {
    await createExercise(page, "Deadlift", {
      description: "Conventional deadlift",
      weight: "120",
      reps: "5",
    });

    // Reload and verify data is still there
    await page.goto("/exercise");
    await expect(page.getByText("Deadlift", { exact: true })).toBeVisible();
    await expect(page.getByText("120 kg")).toBeVisible();

    // Navigate to detail and verify all fields
    await page.getByRole("link", { name: "Deadlift" }).click();
    await expect(page.getByText("Conventional deadlift")).toBeVisible();
    await expect(page.getByText("120 kg")).toBeVisible();
  });

  test("creating multiple exercises shows them all in list", async ({
    page,
  }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createExercise(page, "Squat", { weight: "100", reps: "5" });
    await createExercise(page, "Deadlift", { weight: "120", reps: "3" });

    await page.goto("/exercise");

    await expect(page.getByText("Bench Press")).toBeVisible();
    await expect(page.getByText("Squat")).toBeVisible();
    await expect(page.getByText("Deadlift")).toBeVisible();
  });
});
