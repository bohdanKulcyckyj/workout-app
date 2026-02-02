import { test, expect } from "@playwright/test";
import { clearStorage } from "./helpers";

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
    await page.goto("/plan/create");

    // Fill plan name
    await page.getByLabel("Plan Name").fill("Push Day");

    // Fill first exercise (already present by default)
    const rows = page.locator("tbody tr");
    const firstRow = rows.nth(0);
    await firstRow.getByPlaceholder("Exercise name").fill("Bench Press");
    await firstRow.getByRole("spinbutton").nth(0).fill("60");
    await firstRow.getByRole("spinbutton").nth(1).fill("8");

    // Add a second exercise
    await page.getByRole("button", { name: /add exercise/i }).click();
    const secondRow = rows.nth(1);
    await secondRow.getByPlaceholder("Exercise name").fill("Overhead Press");
    await secondRow.getByRole("spinbutton").nth(0).fill("30");
    await secondRow.getByRole("spinbutton").nth(1).fill("10");

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

  test("can add and remove exercise rows", async ({ page }) => {
    await page.goto("/plan/create");

    const rows = page.locator("tbody tr");

    // Starts with one row
    await expect(rows).toHaveCount(1);

    // Add a second row
    await page.getByRole("button", { name: /add exercise/i }).click();
    await expect(rows).toHaveCount(2);

    // Remove the second row
    await page
      .getByRole("button", { name: /remove exercise/i })
      .nth(1)
      .click();
    await expect(rows).toHaveCount(1);

    // Remove the last remaining row — should auto-append a blank row
    await page
      .getByRole("button", { name: /remove exercise/i })
      .first()
      .click();
    await expect(rows).toHaveCount(1);

    // The auto-appended row should have empty name
    await expect(
      rows.nth(0).getByPlaceholder("Exercise name")
    ).toHaveValue("");
  });
});
