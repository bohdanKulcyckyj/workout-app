import { test, expect } from "@playwright/test";
import { resetAndLogin, createExercise, createPlan } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetAndLogin(page);
});

test.describe("View Plan", () => {
  test("plan detail page shows all exercise data", async ({ page }) => {
    await createExercise(page, "Squat", { weight: "80", reps: "5" });
    await createExercise(page, "Leg Press", { weight: "120", reps: "10" });
    await createPlan(page, "Leg Day", ["Squat", "Leg Press"]);

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
    await createExercise(page, "Deadlift", { weight: "100", reps: "5" });
    await createExercise(page, "Barbell Row", { weight: "60", reps: "8" });
    await createPlan(page, "Pull Day", ["Deadlift", "Barbell Row"]);

    await page.goto("/");

    await expect(page.getByText("Pull Day")).toBeVisible();
    await expect(page.getByText("2 exercises")).toBeVisible();
  });

  test("plan detail has navigation buttons", async ({ page }) => {
    await createExercise(page, "Curl", { weight: "15", reps: "12" });
    await createPlan(page, "Arms", ["Curl"]);

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
