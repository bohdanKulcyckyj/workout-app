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

test.describe("Delete Plan", () => {
  test("can delete a plan from home page", async ({ page }) => {
    await createPlan(page, "Push Day", [
      { name: "Bench Press", weight: "60", reps: "8" },
    ]);

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
    await createPlan(page, "Pull Day", [
      { name: "Deadlift", weight: "100", reps: "5" },
    ]);

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
    await createPlan(page, "Only Plan", [
      { name: "Curl", weight: "15", reps: "12" },
    ]);

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
