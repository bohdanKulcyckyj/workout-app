import { test, expect } from "@playwright/test";
import { resetAndLogin, createExercise, createPlan } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetAndLogin(page);
});

test.describe("Delete Plan", () => {
  test("can delete a plan from home page", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createPlan(page, "Push Day", ["Bench Press"]);

    await page.goto("/");
    await expect(page.getByText("Push Day")).toBeVisible();

    // Open dropdown menu
    await page.getByRole("button", { name: /open menu/i }).click();

    // Click Delete in dropdown
    await page.getByRole("menuitem", { name: /delete/i }).click();

    // Verify confirmation dialog appears
    await expect(page.getByText("Delete Plan")).toBeVisible();
    await expect(
      page.getByText(/are you sure you want to delete "Push Day"/i)
    ).toBeVisible();

    // Confirm deletion
    await page
      .getByRole("button", { name: "Delete" })
      .click();

    // Verify plan removed from list
    await expect(page.getByText("Push Day")).not.toBeVisible();
  });

  test("delete confirmation dialog can be cancelled", async ({ page }) => {
    await createExercise(page, "Deadlift", { weight: "100", reps: "5" });
    await createPlan(page, "Pull Day", ["Deadlift"]);

    await page.goto("/");
    await expect(page.getByText("Pull Day")).toBeVisible();

    // Open dropdown menu and click Delete
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();

    // Verify dialog appeared
    await expect(page.getByText("Delete Plan")).toBeVisible();

    // Cancel the dialog
    await page.getByRole("button", { name: "Cancel" }).click();

    // Verify plan still exists
    await expect(page.getByText("Pull Day")).toBeVisible();
  });

  test("deleting last plan shows empty state", async ({ page }) => {
    await createExercise(page, "Curl", { weight: "15", reps: "12" });
    await createPlan(page, "Only Plan", ["Curl"]);

    await page.goto("/");
    await expect(page.getByText("Only Plan")).toBeVisible();

    // Open dropdown menu, click Delete
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();

    // Confirm deletion
    await page
      .getByRole("button", { name: "Delete" })
      .click();

    // Verify empty state message appears
    await expect(page.getByText("No workout plans yet")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /create your first plan/i })
    ).toBeVisible();
  });
});
